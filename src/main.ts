#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

import { GrocyMcpServer } from './server/mcp-server.js';
import config from './config/environment.js';
import { VERSION, PACKAGE_NAME as SERVER_NAME } from './version.js';

// Debug output to help identify version and naming issues
console.error(`Starting ${SERVER_NAME} server version ${VERSION}`);

async function main() {
  try {
    // Validate configuration early
    const envConfig = config.get();
    
    // Ensure required environment variables
    if (!config.hasApiKeyAuth()) {
      console.error('[WARNING] No GROCY_APIKEY_VALUE configured. Some API calls may fail.');
    }

    // Create and start the server
    const server = new GrocyMcpServer();
    await server.start();
    
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[FATAL] Unhandled error:', error);
  process.exit(1);
});