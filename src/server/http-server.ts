import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { MCPRequest, MCPResponse } from '@modelcontextprotocol/sdk/types.js';
import { VERSION, PACKAGE_NAME as SERVER_NAME } from '../version.js';

// HTTP Transport for MCP (Context7 style)
export function startHttpServer(mcpServer: Server, port: number = 8080) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'POST' && req.url === '/mcp') {
      // Streamable HTTP endpoint (NDJSON)
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const mcpReq: MCPRequest = JSON.parse(body);
          const mcpRes: MCPResponse = await mcpServer.handle(mcpReq);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mcpRes));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    } else if (req.method === 'GET' && req.url === '/mcp/sse') {
      // SSE endpoint
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      // For demo: send a welcome event
      res.write(`event: welcome\ndata: {"server":"${SERVER_NAME}","version":"${VERSION}"}\n\n`);
      // You would implement actual MCP streaming here
      // For now, just keep the connection open
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(port, () => {
    console.error(`[MCP] HTTP server listening on port ${port}`);
  });
  return server;
}
