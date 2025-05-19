# MCP Grocy API

[![npm version](https://img.shields.io/npm/v/mcp-grocy-api.svg)](https://www.npmjs.com/package/mcp-grocy-api)
[![Docker Image](https://img.shields.io/badge/docker%20image-ghcr.io-blue)](https://github.com/saya6k/mcp-grocy-api/pkgs/container/mcp-grocy-api)
[![License](https://img.shields.io/github/license/saya6k/mcp-grocy-api)](LICENSE)
[![Configuration Status](https://github.com/saya6k/mcp-grocy-api/actions/workflows/validate-config.yml/badge.svg)](https://github.com/saya6k/mcp-grocy-api/actions/workflows/validate-config.yml)
[![CI/CD Pipeline](https://github.com/saya6k/mcp-grocy-api/actions/workflows/pipeline.yml/badge.svg)](https://github.com/saya6k/mcp-grocy-api/actions/workflows/pipeline.yml)

This project is a specialized fork of [mcp-rest-api](https://github.com/dkmaker/mcp-rest-api), refactored to work specifically with Grocy's API.

## Installation

### NPM

```bash
git clone https://github.com/saya6k/mcp-grocy-api.git
cd mcp-grocy-api
npm install
npm run build
```

### Docker

```bash
docker run -p 8080:8080 -e GROCY_API_KEY=your_api_key -e GROCY_API_URL=http://your-grocy-instance ghcr.io/saya6k/mcp-grocy-api:latest
```

### Home Assistant Add-on

The MCP Grocy API is available as a Home Assistant add-on through [saya6k's add-on repository](https://github.com/saya6k/hassio-addons).

## Usage

To use the API, you need to provide the Grocy API URL and API key:

```bash
# Start the server with environment variables
GROCY_BASE_URL=http://your-grocy-instance GROCY_APIKEY_VALUE=your_api_key npx mcp-grocy-api
```

Or to start in development mode:

```bash
# Start the server with sample/mock responses (no real Grocy instance needed)
npx mcp-grocy-api --mock
```

### Environment Variables

- `GROCY_BASE_URL`: Your Grocy API URL
- `GROCY_APIKEY_VALUE`: Your Grocy API key
- `PORT`: Port to run the server on (default: 8080)
- `LOG_LEVEL`: Log level (default: info)

## Documentation

### API Reference

For the full API reference, see the [API Reference](build/resources/api-reference.md).

### Configuration

For configuration options, see the [Configuration Guide](build/resources/config.md).

## Development

### Prerequisites

- Node.js 18 or higher
- Grocy instance (or use `--mock` for development)

### Testing

```bash
npm test
```

## License

This project is licensed under the [MIT License](LICENSE).

# Release trigger update Sun May 18 11:47:48 +09 2025
