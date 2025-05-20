import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import express from 'express';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { VERSION, PACKAGE_NAME as SERVER_NAME } from '../version.js';

// HTTP Transport for MCP (Context7 style)
export function startHttpServer(mcpServer: Server, port: number = 8080) {
  const app = express();
  app.use(express.json());

  // Session management for transports
  const streamableTransports: Record<string, StreamableHTTPServerTransport> = {};
  const sseTransports: Record<string, SSEServerTransport> = {};

  // Streamable HTTP endpoint (Context7 modern)
  app.post('/mcp', async (req, res) => {
    console.error('[DEBUG] Incoming /mcp request:', JSON.stringify(req.body), 'Session ID:', req.headers['mcp-session-id']);
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && streamableTransports[sessionId]) {
      transport = streamableTransports[sessionId];
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          streamableTransports[sid] = transport;
        }
      });
      transport.onclose = () => {
        if (transport.sessionId) delete streamableTransports[transport.sessionId];
      };
      await mcpServer.connect(transport);
    }
    await transport.handleRequest(req, res, req.body);
  });

  // SSE endpoint (Context7 legacy)
  app.get('/mcp/sse', async (req, res) => {
    const transport = new SSEServerTransport('/mcp/messages', res);
    sseTransports[transport.sessionId] = transport;
    res.on('close', () => {
      delete sseTransports[transport.sessionId];
    });
    await mcpServer.connect(transport);
  });

  // Legacy message endpoint for SSE
  app.post('/mcp/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = sseTransports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).send('No transport found for sessionId');
    }
  });

  app.listen(port, () => {
    console.error(`[MCP] HTTP server (Express) listening on port ${port}`);
  });
}
