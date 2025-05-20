# MCP Grocy API - Home Assistant Addon

This addon allows you to run MCP server that communicates with Grocy API in your Home Assistant instance, and provides an stdio protocol connection for connecting Grocy inventory management to other systems.

## Installation

1. Add this repository to your Home Assistant addon store: 
   [![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https://github.com/saya6k/hassio-addons)

2. Find the "MCP Grocy API" addon and click Install.


## How-to-use

You cannot use this with [Model Context Protocol](https://www.home-assistant.io/integrations/mcp) alone.

For now, you must use it with MCP Proxy in order to communicate with stdio protocol.

## Configuration

### Addon Configuration

```yaml
grocy_base_url: http://a0d7b954-grocy:80
grocy_api_key: your_api_key_here
enable_ssl_verify: false
response_size_limit: 10000
```

### Option: `grocy_base_url` (required)
- The URL to your Grocy instance.
- Example: `https://grocy.example.com`

### Option: `grocy_api_key` (required)
- Your Grocy API key.
- You can find this in your Grocy settings.

### Option: `enable_ssl_verify` (optional)
- Set to `false` to disable SSL verification (useful for self-signed certificates).
- Default: `true`

### Option: `response_size_limit` (optional)
- Maximum size of API responses.
- Default: `10000`

### Option: `enable_http_server` (optional)
- Set to `false` to disable streamable http and sse protocol server.
- Default: `true`

## Communication

This addon communicates with Home Assistant via standard input/output (stdio) or streamable http server using endpoint `/mcp` and SSE protocol using endpoint `/mcp/sse`

## Support

If you have any issues or questions, please file an issue on the GitHub repository.