# MCP Grocy Configuration Guide

Advanced configuration reference for the MCP Grocy server. For basic setup, see the [README](../../README.md).

## 🔧 Configuration Variables

### Core Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GROCY_BASE_URL` | Your Grocy instance URL | `http://localhost:9283` | ✅ |
| `GROCY_APIKEY_VALUE` | Your Grocy API key | - | ✅ |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GROCY_ENABLE_SSL_VERIFY` | SSL certificate verification | `true` | `false` |
| `REST_RESPONSE_SIZE_LIMIT` | Response size limit (bytes) | `10000` | `50000` |

## 🌐 HTTP Server Configuration

Enable HTTP/SSE transport for web-based access:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ENABLE_HTTP_SERVER` | Enable HTTP/SSE transport | `false` | `true` |
| `HTTP_SERVER_PORT` | HTTP server port | `8080` | `3000` |

### Transport Modes
- **stdio** (default) - Standard MCP protocol for CLI/desktop clients
- **HTTP** - Streamable HTTP for web applications (`POST /mcp`)
- **SSE** - Server-Sent Events for real-time web clients (`GET /mcp/sse`)

## 🛠️ Tool Configuration

### Tool Toggle System

Enable/disable specific tools using the `TOOL__` prefix pattern:

```bash
# Stock management
TOOL__get_all_stock=true
TOOL__purchase_product=true
TOOL__consume_product=false

# Shopping lists  
TOOL__get_shopping_list=true
TOOL__add_shopping_list_item=true

# Meal planning
TOOL__get_meal_plan=true
TOOL__add_recipe_to_meal_plan=true
```

### Available Tool Categories

#### 📦 Stock Management Tools
```bash
TOOL__get_all_stock=true                     # Get all stock entries
TOOL__get_stock_volatile=true                # Get due/expired products
TOOL__get_stock_by_location=true             # Stock by specific location
TOOL__inventory_product=true                 # Set stock amounts
TOOL__purchase_product=true                  # Record purchases
TOOL__consume_product=true                   # Record consumption
TOOL__transfer_product=true                  # Move stock between locations
TOOL__open_product=true                      # Mark products as opened
```

#### 🛒 Shopping & Planning Tools
```bash
TOOL__get_shopping_list=true                 # Get shopping lists
TOOL__add_shopping_list_item=true            # Add to shopping list
TOOL__remove_shopping_list_item=true         # Remove from shopping list
TOOL__get_shopping_locations=true            # Get store locations
```

#### 🍽️ Recipe & Meal Planning Tools
```bash
TOOL__get_recipes=true                       # Get all recipes
TOOL__get_recipe_by_id=true                  # Get specific recipe
TOOL__create_recipe=true                     # Create new recipes
TOOL__get_recipe_fulfillment=true            # Check recipe availability
TOOL__consume_recipe=true                    # Cook a recipe
TOOL__get_meal_plan=true                     # Get meal plans
TOOL__add_recipe_to_meal_plan=true           # Schedule meals
TOOL__delete_recipe_from_meal_plan=true      # Remove from meal plan
TOOL__cooked_something=true                  # Complete cooking workflow
```

#### 🏠 Household Management Tools
```bash
TOOL__track_chore_execution=true             # Record chore completion
TOOL__complete_task=true                     # Mark tasks as done
TOOL__charge_battery=true                    # Record battery charging
TOOL__get_chores=true                        # Get all chores
TOOL__get_tasks=true                         # Get all tasks
TOOL__get_batteries=true                     # Get battery info
```

#### 🔧 System & Utility Tools
```bash
TOOL__get_products=true                      # Get product information
TOOL__lookup_product=true                    # Fuzzy product search
TOOL__get_locations=true                     # Get storage locations
TOOL__get_quantity_units=true                # Get quantity units
TOOL__get_users=true                         # Get user information
TOOL__call_grocy_api=true                    # Make custom API calls
TOOL__test_request=true                      # Test API endpoints
```

### Tool Sub-Configuration

Some tools have additional configuration options:

```bash
# cooked_something tool options
TOOL__cooked_something__allow_meal_plan_entry_already_done=false
TOOL__cooked_something__allow_no_meal_plan=false
TOOL__cooked_something__print_labels=true
```

## 📋 Configuration Presets

### Read-Only Mode
Safe for information gathering only:
```bash
# Enable only GET operations
TOOL__get_all_stock=true
TOOL__get_recipes=true
TOOL__get_meal_plan=true
TOOL__get_shopping_list=true
TOOL__get_products=true
TOOL__lookup_product=true
# Disable all modification tools
TOOL__purchase_product=false
TOOL__consume_product=false
TOOL__add_shopping_list_item=false
```

### Meal Planning Focus
For meal planning and recipe management:
```bash
# Recipe and meal planning tools
TOOL__get_recipes=true
TOOL__get_recipe_by_id=true
TOOL__get_recipe_fulfillment=true
TOOL__get_meal_plan=true
TOOL__add_recipe_to_meal_plan=true
TOOL__delete_recipe_from_meal_plan=true
TOOL__cooked_something=true

# Supporting tools
TOOL__get_products=true
TOOL__lookup_product=true
TOOL__get_all_stock=true
TOOL__add_missing_products_to_shopping_list=true
```

### Stock Management Focus
For inventory and shopping management:
```bash
# Stock operations
TOOL__get_all_stock=true
TOOL__get_stock_volatile=true
TOOL__purchase_product=true
TOOL__consume_product=true
TOOL__inventory_product=true

# Shopping management  
TOOL__get_shopping_list=true
TOOL__add_shopping_list_item=true
TOOL__remove_shopping_list_item=true

# Product management
TOOL__get_products=true
TOOL__lookup_product=true
```

## 🔒 Security Considerations

### API Key Security
- Never commit API keys to version control
- Use `.env` files for local development
- Use secure environment variable management in production

### Tool Access Control
- Disable unused tools to reduce attack surface
- Use read-only mode for information-gathering use cases
- Be cautious with tools that modify data (`purchase_product`, `consume_product`, etc.)

### Network Security
- Use HTTPS for production Grocy instances
- Consider SSL verification settings carefully
- Limit response sizes to prevent memory issues

## 📝 Environment File Examples

### Development Configuration
```bash
# .env for development
GROCY_BASE_URL=http://localhost:9283
GROCY_APIKEY_VALUE=dev_api_key_here
GROCY_ENABLE_SSL_VERIFY=false
REST_RESPONSE_SIZE_LIMIT=50000

# Enable HTTP server for testing
ENABLE_HTTP_SERVER=true
HTTP_SERVER_PORT=8080

# Enable commonly used tools
TOOL__get_all_stock=true
TOOL__get_recipes=true
TOOL__get_meal_plan=true
TOOL__lookup_product=true
```

### Production Configuration
```bash
# .env for production
GROCY_BASE_URL=https://grocy.yourdomain.com
GROCY_APIKEY_VALUE=secure_production_key
GROCY_ENABLE_SSL_VERIFY=true
REST_RESPONSE_SIZE_LIMIT=20000

# Selective tool enablement for security
TOOL__get_all_stock=true
TOOL__get_recipes=true
TOOL__add_recipe_to_meal_plan=true
TOOL__get_shopping_list=true
# Explicitly disable sensitive operations
TOOL__call_grocy_api=false
TOOL__test_request=false
```

## 🔄 Configuration Management

### Loading Order
1. Default values
2. Environment variables
3. `.env` file (if present)

### Validation
- Server validates all tool names at startup
- Invalid configuration prevents server start
- Error messages show valid options

### Runtime Changes
- Configuration changes require server restart
- Use process managers (PM2, systemd) for production restarts
- Docker containers need to be recreated with new environment

## 🐛 Troubleshooting Configuration

### Common Issues

**Tool toggle not working**
- Check exact spelling of tool names
- Ensure `TOOL__` prefix is correct
- Verify boolean values (`true`/`false`)

**SSL/TLS connection errors**
- Set `GROCY_ENABLE_SSL_VERIFY=false` for self-signed certificates
- Verify Grocy URL is accessible
- Check firewall and network settings

**Large response errors**
- Increase `REST_RESPONSE_SIZE_LIMIT`
- Consider disabling unused tools to reduce response size
- Check Grocy instance has reasonable data volumes

### Debugging Configuration
```bash
# Use mock mode to test configuration
npm run dev

# Enable MCP inspector for protocol debugging  
npm run inspector

# Check configuration loading
# (Server logs show loaded configuration at startup)
```