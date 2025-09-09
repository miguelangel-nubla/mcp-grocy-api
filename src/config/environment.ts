import { z } from 'zod';

// Environment variable schema with validation and defaults
const EnvironmentSchema = z.object({
  // Grocy Configuration
  GROCY_BASE_URL: z.string().url().default('http://localhost:9283'),
  GROCY_APIKEY_VALUE: z.string().optional(),
  GROCY_ENABLE_SSL_VERIFY: z.string().default('true').transform(val => val !== 'false'),

  // Server Configuration
  ENABLE_HTTP_SERVER: z.string().default('false').transform(val => 
    ['true', 'yes', '1', 'on', 'enabled'].includes(val.toLowerCase())
  ),
  HTTP_SERVER_PORT: z.string().default('8080').transform(val => parseInt(val, 10)),

  // API Configuration
  REST_RESPONSE_SIZE_LIMIT: z.string().default('10000').transform(val => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('REST_RESPONSE_SIZE_LIMIT must be a positive number');
    }
    return parsed;
  }),

  // Tool Configuration
  ALLOWED_TOOLS: z.string().optional(),
  BLOCKED_TOOLS: z.string().optional(),

  // Build Configuration
  RELEASE_VERSION: z.string().optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Environment;

  private constructor() {
    try {
      this.config = EnvironmentSchema.parse(process.env);
      this.validateConfiguration();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[CONFIG ERROR] Invalid environment variables:');
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
        process.exit(1);
      }
      throw error;
    }
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private validateConfiguration(): void {
    // Custom validation logic
    if (this.config.HTTP_SERVER_PORT < 1 || this.config.HTTP_SERVER_PORT > 65535) {
      throw new Error('HTTP_SERVER_PORT must be between 1 and 65535');
    }

    // Log important configuration
    console.error(`[CONFIG] Grocy Base URL: ${this.config.GROCY_BASE_URL}`);
    console.error(`[CONFIG] SSL Verification: ${this.config.GROCY_ENABLE_SSL_VERIFY ? 'enabled' : 'disabled'}`);
    console.error(`[CONFIG] HTTP Server: ${this.config.ENABLE_HTTP_SERVER ? `enabled on port ${this.config.HTTP_SERVER_PORT}` : 'disabled'}`);
    console.error(`[CONFIG] Response Size Limit: ${this.config.REST_RESPONSE_SIZE_LIMIT} bytes`);
  }

  public get(): Environment {
    return this.config;
  }

  public getGrocyBaseUrl(): string {
    return this.config.GROCY_BASE_URL.replace(/\/+$/, '');
  }

  public getApiUrl(): string {
    return `${this.getGrocyBaseUrl()}/api`;
  }

  public hasApiKeyAuth(): boolean {
    return !!this.config.GROCY_APIKEY_VALUE;
  }

  public getCustomHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const headerPrefix = /^header_/i;
    
    for (const [key, value] of Object.entries(process.env)) {
      if (headerPrefix.test(key) && value !== undefined) {
        const headerName = key.replace(headerPrefix, '');
        headers[headerName] = value;
      }
    }
    
    return headers;
  }

  public parseToolConfiguration(): { allowedTools: Set<string> | null; blockedTools: Set<string> } {
    let allowedTools: Set<string> | null = null;
    const blockedTools: Set<string> = new Set();

    if (this.config.ALLOWED_TOOLS) {
      const allowedList = this.config.ALLOWED_TOOLS.split(',').map(tool => tool.trim()).filter(Boolean);
      allowedTools = new Set(allowedList);
      console.error(`[CONFIG] ALLOWED_TOOLS: ${Array.from(allowedTools).join(', ')}`);
    }

    if (this.config.BLOCKED_TOOLS) {
      const blockedList = this.config.BLOCKED_TOOLS.split(',').map(tool => tool.trim()).filter(Boolean);
      blockedList.forEach(tool => blockedTools.add(tool));
      console.error(`[CONFIG] BLOCKED_TOOLS: ${Array.from(blockedTools).join(', ')}`);
    }

    if (!allowedTools && blockedTools.size === 0) {
      console.error('[CONFIG] No tool restrictions configured - all tools available');
    }

    return { allowedTools, blockedTools };
  }
}

export const config = ConfigManager.getInstance();
export default config;