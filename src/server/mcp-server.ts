import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ErrorCode,
  InitializeRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { VERSION, PACKAGE_NAME as SERVER_NAME } from '../version.js';
import { toolRegistry } from '../tools/index.js';
import config from '../config/environment.js';
import { startHttpServer } from './http-server.js';
import { ResourceHandler } from './resources.js';

export class GrocyMcpServer {
  private server!: Server;
  private enabledTools: Set<string> = new Set();
  private toolSubConfigs: Map<string, Map<string, boolean>> = new Map();
  private resourceHandler: ResourceHandler;

  // Expose server instance for HTTP/SSE transport
  public get serverInstance(): Server {
    return this.server;
  }

  constructor() {
    this.resourceHandler = new ResourceHandler();
    this.parseToolConfiguration();
    this.setupServer();
  }

  private parseToolConfiguration(): void {
    const { enabledTools, toolSubConfigs } = config.parseToolConfiguration();
    this.toolSubConfigs = toolSubConfigs;
    
    // Validate tool names against registry
    const validToolNames = new Set(toolRegistry.getToolNames());
    
    if (enabledTools.size > 0) {
      const invalidTools = Array.from(enabledTools).filter(tool => !validToolNames.has(tool));
      if (invalidTools.length > 0) {
        console.error(`[ERROR] Invalid tool names in configuration: ${invalidTools.join(', ')}`);
        console.error(`[ERROR] Valid tool names are: ${Array.from(validToolNames).sort().join(', ')}`);
        process.exit(1);
      }
      this.enabledTools = enabledTools;
    } else {
      console.error('[CONFIG] No tools enabled - server will have no tools available');
    }
  }

  private isToolAllowed(toolName: string): boolean {
    // Only enabled tools are allowed - all others are disabled by default
    return this.enabledTools.has(toolName);
  }

  private async setupServer(): Promise<void> {
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: VERSION,
        serverUrl: "https://github.com/miguelangel-nubla/mcp-grocy-api",
        documentationUrl: "https://github.com/miguelangel-nubla/mcp-grocy-api/blob/main/README.md"
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // Initialize handler
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      console.error('[DEBUG] Initialize handler called with request:', JSON.stringify(request));
      return {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
        serverInfo: {
          name: SERVER_NAME,
          version: VERSION
        }
      };
    });

    // Plain initialize handler for compatibility
    const PlainInitializeRequestSchema = z.object({
      jsonrpc: z.literal('2.0'),
      id: z.union([z.string(), z.number()]).optional(),
      method: z.literal('initialize'),
      params: z.any().optional()
    });

    this.server.setRequestHandler(PlainInitializeRequestSchema, async (request) => {
      console.error('[DEBUG] Plain "initialize" handler called');
      let protocolVersion = '2024-11-05';
      if (request.params && typeof request.params.protocolVersion === 'string') {
        protocolVersion = request.params.protocolVersion;
      }
      return {
        protocolVersion,
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
        serverInfo: {
          name: SERVER_NAME,
          version: VERSION
        }
      };
    });

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools = toolRegistry.getDefinitions();
      const filteredTools = allTools.filter(tool => this.isToolAllowed(tool.name));
      
      console.error(`[CONFIG] Available tools: ${filteredTools.map(t => t.name).join(', ')}`);
      
      return { tools: filteredTools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      
      // Check if the tool is allowed
      if (!this.isToolAllowed(toolName)) {
        throw new McpError(
          ErrorCode.InvalidRequest, 
          `Tool '${toolName}' is not enabled. Set TOOL__${toolName}=true in your configuration to enable it.`
        );
      }

      // Get handler from registry
      const handler = toolRegistry.getHandler(toolName);
      if (!handler) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`
        );
      }

      try {
        const subConfigs = this.toolSubConfigs.get(toolName);
        const result = await handler(request.params.arguments, subConfigs);
        return result as CallToolResult; // Cast to proper MCP type
      } catch (error: any) {
        console.error(`Error executing tool ${toolName}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message || error}`
        );
      }
    });

    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return this.resourceHandler.listResources();
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.resourceHandler.readResource(request.params.uri);
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  public async start(): Promise<void> {
    // Start STDIO transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Grocy API MCP server running on stdio');

    // Start HTTP/SSE transport if enabled
    const envConfig = config.get();
    if (envConfig.ENABLE_HTTP_SERVER) {
      try {
        console.error(`[CONFIG] Starting HTTP/SSE server on port ${envConfig.HTTP_SERVER_PORT}`);
        const serverFactory = () => new GrocyMcpServer().serverInstance;
        startHttpServer(serverFactory, envConfig.HTTP_SERVER_PORT);
      } catch (error) {
        console.error('[ERROR] Failed to start HTTP/SSE server:', error);
      }
    } else {
      console.error('[CONFIG] HTTP/SSE server is disabled');
    }
  }
}

export default GrocyMcpServer;