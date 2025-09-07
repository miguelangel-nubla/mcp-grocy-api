# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run build` - Build TypeScript to JavaScript (outputs to `build/` directory)
- `npm run watch` - Watch mode for development (auto-rebuild on changes)
- `npm run prepare` - Runs build automatically (used by npm)
- `npm run prebuild` - Pre-build script that sets up version templating

### Testing
- `npm test` - Run all tests using Vitest
- `npm run test:watch` - Run tests in watch mode
- Tests are located in `tests/` directory with `.test.ts` and `.test.js` files

### Development and Debugging
- `npm run inspector` - Launch MCP inspector for debugging protocol interactions
- `npx cross-env GROCY_BASE_URL=http://your-grocy-instance GROCY_APIKEY_VALUE=your_api_key mcp-grocy-api` - Start server
- `npx cross-env GROCY_BASE_URL=http://your-grocy-instance GROCY_APIKEY_VALUE=your_api_key mcp-grocy-api --mock` - Start with mock responses

### Scripts and Utilities
- `npm run update-api-docs` - Fetch and update Grocy API documentation
- `npm run docker-build` - Build Docker image
- `npm run check-tools` - Verify build tools and dependencies
- Various release management scripts for version handling and semantic releases

## Architecture Overview

### MCP Server Structure
This is a **Model Context Protocol (MCP) server** that wraps the Grocy API, built using the `@modelcontextprotocol/sdk`. The main entry point is `src/index.ts` which:
- Sets up MCP server with stdio, HTTP, and SSE transport options
- Handles tool registration for Grocy API operations
- Manages authentication via `GROCY-API-KEY` header
- Provides response size limiting and SSL verification controls

### Key Components

#### Core Server (`src/index.ts`)
- Main MCP server implementation (~67KB file)
- Registers tools for Grocy API operations (batteries, chores, recipes, etc.)
- Handles authentication, request/response processing, and error handling
- Supports multiple transport protocols (stdio, HTTP/SSE)

#### HTTP Server (`src/server/http-server.ts`)
- Provides HTTP and SSE endpoints for MCP protocol
- Enables streamable HTTP transport on configurable port (default: 8080)
- Endpoints: `/mcp` (POST for HTTP), `/mcp/sse` (GET for SSE)

#### Grocy API Services (`src/services/grocy-api/`)
- Modular JavaScript services for different Grocy API domains:
  - `batteries.js` - Battery charge tracking
  - `chores.js` - Chore execution management  
  - `recipes.js` - Recipe and stock fulfillment
  - `tasks.js` - Task management
  - `type-converter.js` - Data type conversion utilities
  - `validator.js` - Input validation
  - `version-checker.js` - API version compatibility

#### Configuration and Resources
- `src/resources/config.md` - Complete configuration documentation
- `src/resources/api-reference.md` - Auto-generated Grocy API reference
- Environment-based configuration with sensible defaults

### Authentication Model
- **API Key Only**: Uses `GROCY-API-KEY` header (hardcoded header name)
- No support for Basic Auth or Bearer tokens (intentionally disabled)
- Environment variable: `GROCY_APIKEY_VALUE`

### Error Handling and Validation
- Comprehensive error handling via `src/services/grocy-api/errors.js`
- Input validation through `validator.js`
- Response size limiting to prevent memory issues
- SSL verification controls for development environments

## Configuration

### Required Environment Variables
- `GROCY_BASE_URL` - Your Grocy instance URL (defaults to `http://localhost:9283`)
- `GROCY_APIKEY_VALUE` - Your Grocy API key

### Optional Environment Variables
- `REST_RESPONSE_SIZE_LIMIT` - Response size limit in bytes (default: 10000)
- `GROCY_ENABLE_SSL_VERIFY` - SSL verification (default: true, set to 'false' to disable)
- `ENABLE_HTTP_SERVER` - Enable HTTP/SSE transport (default: false)
- `HTTP_SERVER_PORT` - HTTP server port (default: 8080)

## Testing Strategy

Tests use **Vitest** framework with comprehensive coverage across:
- API client functionality (`api-client.test.ts`, `api.test.ts`)
- Individual service modules (recipes, tasks, type conversion, validation)
- Configuration and error handling
- Utility functions

Test files mirror the source structure and include both unit and integration tests.

## Commit Convention

Uses **Conventional Commits** with commitlint configuration:
- Standard conventional commit types required
- Body and footer line length limits disabled for flexibility
- Semantic release automation based on commit messages