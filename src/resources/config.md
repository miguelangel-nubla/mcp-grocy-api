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

## Tool Access Control

You can limit which tools are available to the LLM for enhanced security and control.

### ALLOWED_TOOLS (Optional)
- Description: Comma-separated list of tools that are allowed to be used.
- Default: All tools are available if not specified.
- Example: `ALLOWED_TOOLS="get_recipes,get_meal_plan,add_recipe_to_meal_plan"`
- Usage: When set, only the specified tools will be available. All other tools will be hidden and blocked.

### BLOCKED_TOOLS (Optional)
- Description: Comma-separated list of tools that should be blocked/unavailable.
- Default: No tools are blocked if not specified.
- Example: `BLOCKED_TOOLS="create_recipe,call_grocy_api,test_request"`
- Usage: When set, the specified tools will be unavailable. Can be used together with ALLOWED_TOOLS (blocked tools take precedence).

### Tool Filtering Logic
- If `ALLOWED_TOOLS` is set: Only tools in the allow list are available
- If `BLOCKED_TOOLS` is set: Tools in the block list are removed from available tools
- If both are set: Allow list is applied first, then block list is applied (block list takes precedence)
- If neither is set: All tools are available

### Validation
- **Invalid tool names**: The server will exit with an error if any tool name in `ALLOWED_TOOLS` or `BLOCKED_TOOLS` doesn't match a valid tool
- **Error output**: When invalid tools are detected, the server shows which tools are invalid and lists all valid tool names
- **Startup failure**: The server will not start with invalid tool configurations, preventing silent failures

### Example Configurations

**Read-only access:**
```bash
ALLOWED_TOOLS="get_recipes,get_meal_plan,get_meal_plan_sections,get_products,get_stock,get_shopping_list,get_chores,get_tasks,get_locations,get_shopping_locations,get_product_groups,get_quantity_units,get_users,get_batteries,get_equipment,get_stock_volatile,get_recipe_by_id,get_price_history,get_stock_by_location,get_stock_by_product,get_recipe_fulfillment,get_recipes_fulfillment"
```

**Meal planning + recipes + shopping (safe management):**
```bash
ALLOWED_TOOLS="get_stock_volatile,get_shopping_list,get_chores,get_tasks,get_locations,get_shopping_locations,get_product_groups,get_quantity_units,get_users,get_recipes_fulfillment,get_meal_plan,get_products,get_recipes,get_recipe_by_id,get_stock,get_batteries,get_equipment,add_shopping_list_item,add_recipe_to_meal_plan,get_meal_plan_sections,delete_recipe_from_meal_plan,get_price_history,get_stock_by_location,get_stock_by_product,add_recipe_products_to_shopping_list,add_missing_products_to_shopping_list,get_recipe_fulfillment,remove_shopping_list_item"
```

**Meal planning only:**
```bash
ALLOWED_TOOLS="get_recipes,get_meal_plan,get_meal_plan_sections,add_recipe_to_meal_plan,delete_recipe_from_meal_plan,get_recipe_by_id,get_recipe_fulfillment"
```

**Block dangerous operations:**
```bash
BLOCKED_TOOLS="create_recipe,call_grocy_api,test_request,undo_action,purchase_product,consume_product,inventory_product,transfer_product,track_chore_execution,complete_task,charge_battery,consume_recipe,open_product"
```

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
