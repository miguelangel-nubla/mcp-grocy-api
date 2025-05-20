import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import express from 'express';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { VERSION, PACKAGE_NAME as SERVER_NAME } from '../version.js';
import cors from 'cors';
import http from 'http';

// HTTP Transport for MCP (Context7 style)
export function startHttpServer(mcpServer: Server, port: number = 8080) {
  const app = express();
  
  // Enable JSON body parsing with increased limit
  app.use(express.json({
    limit: '10mb'
  }));
  
  // Enable CORS for all routes
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Mcp-Session-Id', 'Authorization'],
    exposedHeaders: ['Mcp-Session-Id', 'Content-Type'],
    optionsSuccessStatus: 200
  }));

  // Simple health check endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: SERVER_NAME,
      version: VERSION,
      message: 'MCP server is running',
      endpoints: {
        streamable: '/mcp',
        sse: '/mcp/sse',
        sseMessages: '/mcp/messages'
      }
    });
  });

  // Session management for transports
  const streamableTransports: Record<string, StreamableHTTPServerTransport> = {};
  const sseTransports: Record<string, SSEServerTransport> = {};

  // Middleware to log all requests
  app.use((req, res, next) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - Headers: ${JSON.stringify(req.headers)}`);
    next();
  });

  // Streamable HTTP endpoint (Context7 modern)
  app.post('/mcp', async (req, res) => {
    try {
      const clientSessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport | undefined = undefined;

      // Accept header check (can be done early)
      const accept = req.headers.accept || '';
      if (!accept.includes('application/json') && !accept.includes('text/event-stream')) {
        console.error('[ERROR] Client must accept application/json or text/event-stream');
        res.status(406).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Not Acceptable: Client must accept application/json or text/event-stream'
          },
          id: req.body?.id || null
        });
        return;
      }

      if (clientSessionId) {
        transport = streamableTransports[clientSessionId];
        if (transport) {
          console.error(`[DEBUG] Using existing transport for session ID: ${clientSessionId}`);
        } else {
          console.error(`[ERROR] Invalid or expired session ID provided: ${clientSessionId}. No active transport found.`);
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: `Invalid or expired session ID: ${clientSessionId}. Please re-initialize.` },
            id: req.body?.id || null
          });
          return;
        }
      } else {
        // No session ID provided by client, this should be an 'initialize' request or similar.
        console.error('[DEBUG] No session ID provided by client. Creating new transport.');
        const newGeneratedSessionId = randomUUID(); // Always generate a fresh ID for a new transport.
        
        const newTransportInstance = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => {
            // This generator is called by the transport. We want it to use the ID we just generated.
            console.error(`[DEBUG] StreamableHTTPServerTransport internal sessionIdGenerator using pre-generated ID: ${newGeneratedSessionId}`);
            return newGeneratedSessionId;
          },
          onsessioninitialized: (initializedSid: string) => {
            console.error(`[DEBUG] Event: StreamableHTTPServerTransport internal session initialized with actual ID: ${initializedSid}.`);
            if (initializedSid !== newGeneratedSessionId) {
              console.error(`[CRITICAL_WARNING] Mismatch between generated session ID ${newGeneratedSessionId} and transport's initialized ID ${initializedSid}!`);
            }
          }
        });
        
        transport = newTransportInstance;

        // Verify the transport's public sessionId property matches our generated ID.
        // This relies on the transport setting its public .sessionId based on its sessionIdGenerator.
        if (!transport.sessionId || transport.sessionId !== newGeneratedSessionId) {
           console.error(`[CRITICAL_ERROR] Newly created transport's public sessionId ('${transport.sessionId}') does not match expected new ID ('${newGeneratedSessionId}'). This may indicate an issue with the transport's constructor or sessionId property assignment.`);
           // If the transport.sessionId is not correctly set by its constructor based on sessionIdGenerator,
           // session management will fail. We should not try to force it here as it hides an SDK issue.
        }

        console.error(`[DEBUG] New transport created. Effective session ID: ${transport.sessionId || 'undefined!'}. Registering with ID: ${newGeneratedSessionId}.`);
        // We must use newGeneratedSessionId as the key, as that's what the transport *should* be using.
        streamableTransports[newGeneratedSessionId] = transport;

        transport.onclose = () => {
          // Use newGeneratedSessionId in closure for safety, or rely on transport.sessionId if consistently set.
          const closedSessionId = transport?.sessionId || newGeneratedSessionId;
          if (streamableTransports[closedSessionId]) {
            console.error(`[DEBUG] Transport for session ID: ${closedSessionId} closed. Removing from active transports.`);
            delete streamableTransports[closedSessionId];
          } else {
            console.error(`[DEBUG] Transport for session ID: ${closedSessionId} closed, but was already removed or not found in active transports.`);
          }
        };

        console.error(`[DEBUG] Connecting new transport (intended ID: ${newGeneratedSessionId}, actual transport.sessionId: ${transport.sessionId}) to MCP server`);
        await mcpServer.connect(transport); 
        console.error(`[DEBUG] New transport (ID: ${transport.sessionId}) connected successfully`);
      }

      if (!transport) {
        console.error('[CRITICAL_ERROR] Transport is undefined before handling request. This should not happen.');
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Internal server error: Transport not available' }, id: req.body?.id || null });
        return;
      }

      if (transport.sessionId) {
        console.error(`[DEBUG] Setting Mcp-Session-Id header to: ${transport.sessionId}`);
        res.setHeader('Mcp-Session-Id', transport.sessionId);
      } else {
        console.error(`[WARNING] Transport instance (client sent ID: ${clientSessionId || 'none'}) has no session ID to set in response headers. This is unexpected.`);
      }
      
      await transport.handleRequest(req, res, req.body);

    } catch (error) {
      console.error('[ERROR] Failed to handle streamable HTTP request:', error);
      
      // Send error response if headers not sent yet
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: `Internal server error: ${error instanceof Error ? error.message : String(error)}`
          },
          id: req.body?.id || null
        });
      }
    }
  });

  // SSE endpoint
  app.get('/mcp/sse', async (req, res) => {
    console.error('[DEBUG] Incoming SSE connection request');
    
    try {
      // Set SSE headers before creating transport
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const transport = new SSEServerTransport('/mcp/messages', res);
      const sessionId = transport.sessionId;
      
      console.error(`[DEBUG] Created SSE transport with session ID: ${sessionId}`);
      sseTransports[sessionId] = transport;
      
      // Handle connection close
      res.on('close', () => {
        console.error(`[DEBUG] SSE connection closed for session ID: ${sessionId}`);
        delete sseTransports[sessionId];
      });
      
      // Adding event for error handling
      res.on('error', (err) => {
        console.error(`[ERROR] SSE connection error for session ID: ${sessionId}:`, err);
        delete sseTransports[sessionId];
      });
      
      // Connect transport to MCP server
      console.error('[DEBUG] Connecting SSE transport to MCP server');
      await mcpServer.connect(transport);
      console.error(`[DEBUG] SSE transport connected for session ${sessionId}`);
      
      // Send initial comment to keep connection alive
      res.write(': connected\n\n');
    } catch (error) {
      console.error('[ERROR] Failed to handle SSE connection:', error);
      
      // Send error response if headers not sent yet
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      } else {
        // If headers are sent, we need to end the response
        res.end();
      }
    }
  });

  // Message endpoint for SSE
  app.post('/mcp/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    console.error(`[DEBUG] Incoming message for SSE session ID: ${sessionId}`);
    
    if (!sessionId) {
      console.error('[ERROR] No sessionId provided in request');
      res.status(400).json({
        error: 'Missing sessionId parameter',
        status: 400
      });
      return;
    }
    
    const transport = sseTransports[sessionId];
    if (transport) {
      try {
        console.error(`[DEBUG] Found transport for session ID: ${sessionId}, handling message`);
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        console.error(`[ERROR] Failed to handle SSE message for session ID: ${sessionId}:`, error);
        res.status(500).json({
          error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
          status: 500
        });
      }
    } else {
      console.error(`[ERROR] No transport found for session ID: ${sessionId}`);
      res.status(404).json({
        error: `No active SSE connection found for session ID: ${sessionId}`,
        status: 404
      });
    }
  });

  // Create HTTP server with explicit error handling
  const server = http.createServer(app);
  
  server.on('error', (error) => {
    console.error(`[ERROR] HTTP server error: ${error.message}`);
  });
  
  // Start the server
  server.listen(port, () => {
    console.error(`[MCP] HTTP server listening on port ${port}`);
    console.error(`[MCP] Available endpoints:`);
    console.error(`[MCP]   - Health check: http://localhost:${port}/`);
    console.error(`[MCP]   - Streamable HTTP: http://localhost:${port}/mcp`);
    console.error(`[MCP]   - SSE: http://localhost:${port}/mcp/sse`);
    console.error(`[MCP]   - SSE Messages: http://localhost:${port}/mcp/messages`);
  });
  
  return server;
}
