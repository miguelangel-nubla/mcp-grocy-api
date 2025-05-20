# Grocy API MCP Configuration

This document describes all available configuration options for the Grocy API MCP server.

## Core Configuration

### GROCY_BASE_URL (Required)
- Description: The base URL for your Grocy instance.
- Example: `http://localhost:9283` or `https://my.grocy.server.com`
- Usage: All API endpoint paths will be appended to this URL.

### REST_RESPONSE_SIZE_LIMIT (Optional)
- Description: Maximum size in bytes for API response data.
- Default: 10000 (10KB)
- Example: `50000` for 50KB limit.
- Usage: Helps prevent memory issues with large responses. If a response exceeds this size, it will be truncated.

### GROCY_ENABLE_SSL_VERIFY (Optional)
- Description: Controls SSL certificate verification for the Grocy API.
- Default: `true`
- Values: Set to `false` to disable SSL verification (e.g., for self-signed certificates).
- Usage: Disable when testing Grocy instances with self-signed certificates in development environments.

### ENABLE_HTTP_SERVER (Optional)
- Description: Enable Streamable HTTP server in MCP-Grocy-API
- Default: `false`
- Values: Set to `true` to enable Streamable http server.
- Usage: Enable when to usehttp server 

### HTTP_SERVER_PORT (Optional)
- Description: The port for the Streamable HTTP/SSE server.
- Default: `8080`
- Example: `HTTP_SERVER_PORT=8080`
- Usage: Set this to change the port the HTTP/SSE server listens on. Must match the port exposed in Docker or your deployment config.

## Authentication Configuration

The tool supports API Key authentication for Grocy.

### API Key (Required for most operations)
- `GROCY_APIKEY_VALUE`: Your Grocy API key.
- Header Name: The API key is always sent using the `GROCY-API-KEY` header.
- Example:
  ```
  GROCY_APIKEY_VALUE=yourverysecretapikey
  ```
- Usage: When `GROCY_APIKEY_VALUE` is set, requests will include the `GROCY-API-KEY` header with its value.

## HTTP/SSE Transport

The MCP Grocy API server now supports:

- **stdio** (default, Context7 MCP protocol)
- **HTTP** (streamable, Context7-compatible, opt-in, port configurable via `HTTP_SERVER_PORT`)
- **SSE** (Server-Sent Events, for backward compatibility)

To enable HTTP/SSE transport, set:

```
ENABLE_HTTP_SERVER=true
HTTP_SERVER_PORT=8080 # (optional, default: 8080)
```

The HTTP server will listen on the port specified by `HTTP_SERVER_PORT`. Make sure to expose this port in your Dockerfile or deployment configuration.

- POST requests to `/mcp` for streamable HTTP (NDJSON or JSON)
- GET requests to `/mcp/sse` for SSE (Server-Sent Events)

All transports use the same MCP protocol and core logic.

## Configuration Examples

### Local Development with Grocy
```bash
GROCY_BASE_URL=http://localhost:9283
GROCY_APIKEY_VALUE=yourlocalapikey
GROCY_ENABLE_SSL_VERIFY=false
REST_RESPONSE_SIZE_LIMIT=50000
```

### Production Grocy API with API Key
```bash
GROCY_BASE_URL=https://my.grocy.server.com
GROCY_APIKEY_VALUE=yourproductionapikey
```

### Grocy API with Custom Headers
```bash
GROCY_BASE_URL=https://my.grocy.server.com
GROCY_APIKEY_VALUE=yourproductionapikey
```

## Changing Configuration

Configuration can be updated by:
1. Setting environment variables before starting the server
2. Modifying the MCP server configuration file
3. Using environment variable commands in your terminal

Remember to restart the server after changing configuration for the changes to take effect.
