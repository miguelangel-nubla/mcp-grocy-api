#!/bin/bash
# Development runner script that uses .env file for configuration

# Build the project
npm run build

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load .env file and run the server
set -a  # automatically export all variables
source .env
set +a  # disable automatic export

echo "Starting MCP Grocy API server with configuration from .env..."
echo "Server URL: ${GROCY_BASE_URL}"
echo "HTTP Server: ${ENABLE_HTTP_SERVER:-false}"
if [ "${ENABLE_HTTP_SERVER}" = "true" ]; then
    echo "HTTP Server Port: ${HTTP_SERVER_PORT:-8080}"
fi

node build/main.js