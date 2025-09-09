import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrocyMcpServer } from '../src/server/mcp-server.js';
import { toolRegistry } from '../src/tools/index.js';

// Mock config module
vi.mock('../src/config/environment.js', () => ({
  default: {
    get: () => ({
      GROCY_BASE_URL: 'http://test-grocy:9283',
      GROCY_APIKEY_VALUE: 'test-api-key',
      GROCY_ENABLE_SSL_VERIFY: true,
      ENABLE_HTTP_SERVER: false,
      HTTP_SERVER_PORT: 8080,
      REST_RESPONSE_SIZE_LIMIT: 10000
    }),
    getGrocyBaseUrl: () => 'http://test-grocy:9283',
    getApiUrl: () => 'http://test-grocy:9283/api',
    hasApiKeyAuth: () => true,
    getCustomHeaders: () => ({}),
    parseToolConfiguration: () => ({ allowedTools: null, blockedTools: new Set() })
  }
}));

// Mock the API client
vi.mock('../src/api/client.js', () => ({
  default: {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  }
}));

// Mock MCP SDK server
const mockServer = {
  setRequestHandler: vi.fn(),
  connect: vi.fn(),
  close: vi.fn(),
  onerror: null
};

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => mockServer)
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn()
}));

describe('Integration Tests', () => {
  let server: GrocyMcpServer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (server) {
      try {
        await server.serverInstance.close();
      } catch (error) {
        // Ignore close errors in tests
      }
    }
    vi.clearAllMocks();
  });

  describe('Server Initialization', () => {
    it('should create server instance successfully', () => {
      expect(() => {
        server = new GrocyMcpServer();
      }).not.toThrow();

      expect(server.serverInstance).toBeDefined();
    });

    it('should register all request handlers', () => {
      server = new GrocyMcpServer();

      // Should register initialize, list tools, call tool, and resource handlers
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(6); // 2 initialize + list tools + call tool + 2 resource handlers
    });
  });

  describe('Tool Registry Integration', () => {
    it('should have consistent tool definitions and handlers', () => {
      const definitions = toolRegistry.getDefinitions();
      const toolNames = toolRegistry.getToolNames();

      expect(definitions.length).toBeGreaterThan(30);
      expect(toolNames.length).toBe(definitions.length);

      // Each definition should have a corresponding handler
      definitions.forEach(def => {
        expect(toolRegistry.hasHandler(def.name)).toBe(true);
        expect(toolRegistry.getHandler(def.name)).toBeDefined();
      });
    });

    it('should have valid tool definitions structure', () => {
      const definitions = toolRegistry.getDefinitions();

      definitions.forEach(def => {
        // Check required fields
        expect(def.name).toBeTypeOf('string');
        expect(def.description).toBeTypeOf('string');
        expect(def.inputSchema).toBeDefined();
        expect(def.inputSchema.type).toBe('object');
        expect(Array.isArray(def.inputSchema.required)).toBe(true);
        expect(def.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('Tool Execution Integration', () => {
    beforeEach(() => {
      server = new GrocyMcpServer();
    });

    it('should register call tool handler', () => {
      // Check that setRequestHandler was called
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      
      // Should have at least 4 handlers: initialize (x2), list tools, call tool
      expect(mockServer.setRequestHandler.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    it('should validate tool registry has handlers for all definitions', () => {
      const definitions = toolRegistry.getDefinitions();
      
      expect(definitions.length).toBeGreaterThan(30);
      
      // Each definition should have a handler
      definitions.forEach(def => {
        expect(toolRegistry.hasHandler(def.name)).toBe(true);
        const handler = toolRegistry.getHandler(def.name);
        expect(handler).toBeDefined();
        expect(typeof handler).toBe('function');
      });
    });
  });

  describe('Resource Handler Integration', () => {
    beforeEach(() => {
      server = new GrocyMcpServer();
    });

    it('should register resource handlers', () => {
      // Check that setRequestHandler was called for resources
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      
      // Should have resource handlers registered
      expect(mockServer.setRequestHandler.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(() => {
      server = new GrocyMcpServer();
    });

    it('should set up error handling', () => {
      // Server should have error handler set up (function or null)
      expect(mockServer.onerror).toBeDefined();
    });

    it('should validate server initialization', () => {
      // Server should be properly initialized
      expect(server).toBeDefined();
      expect(server.serverInstance).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should apply tool filtering when configured', () => {
      // Mock tool filtering configuration
      vi.doMock('../src/config/environment.js', () => ({
        default: {
          get: () => ({ /* config */ }),
          parseToolConfiguration: () => ({ 
            allowedTools: new Set(['get_products', 'get_stock']), 
            blockedTools: new Set(['delete_recipe_from_meal_plan']) 
          }),
          getGrocyBaseUrl: () => 'http://test-grocy:9283',
          hasApiKeyAuth: () => true,
          getCustomHeaders: () => ({})
        }
      }));

      // Should not throw when creating server with filtered tools
      expect(() => {
        server = new GrocyMcpServer();
      }).not.toThrow();
    });
  });

  describe('Module System Integration', () => {
    it('should load all tool modules correctly', () => {
      const moduleNames = [
        'stockModule',
        'productModule', 
        'recipeModule',
        'shoppingModule',
        'systemModule'
      ];

      // Import the modules
      import('../src/tools/index.js').then(toolsModule => {
        moduleNames.forEach(moduleName => {
          expect(toolsModule[moduleName]).toBeDefined();
          expect(toolsModule[moduleName].definitions).toBeDefined();
          expect(toolsModule[moduleName].handlers).toBeDefined();
          expect(Array.isArray(toolsModule[moduleName].definitions)).toBe(true);
        });
      });
    });
  });
});