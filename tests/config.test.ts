import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../src/config/environment.js';

describe('ConfigManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  it('should use default values when no environment variables are set', () => {
    process.env = {};
    
    // We can't directly test ConfigManager due to singleton pattern,
    // but we can test the behavior through environment manipulation
    expect(() => {
      const config = new (ConfigManager as any)();
      const env = config.get();
      expect(env.GROCY_BASE_URL).toBe('http://localhost:9283');
      expect(env.GROCY_ENABLE_SSL_VERIFY).toBe(true);
      expect(env.ENABLE_HTTP_SERVER).toBe(false);
      expect(env.HTTP_SERVER_PORT).toBe(8080);
      expect(env.REST_RESPONSE_SIZE_LIMIT).toBe(10000);
    }).not.toThrow();
  });

  it('should parse environment variables correctly', () => {
    process.env.GROCY_BASE_URL = 'https://my-grocy.example.com';
    process.env.GROCY_ENABLE_SSL_VERIFY = 'false';
    process.env.ENABLE_HTTP_SERVER = 'true';
    process.env.HTTP_SERVER_PORT = '3000';
    process.env.REST_RESPONSE_SIZE_LIMIT = '50000';
    
    expect(() => {
      const config = new (ConfigManager as any)();
      const env = config.get();
      expect(env.GROCY_BASE_URL).toBe('https://my-grocy.example.com');
      expect(env.GROCY_ENABLE_SSL_VERIFY).toBe(false);
      expect(env.ENABLE_HTTP_SERVER).toBe(true);
      expect(env.HTTP_SERVER_PORT).toBe(3000);
      expect(env.REST_RESPONSE_SIZE_LIMIT).toBe(50000);
    }).not.toThrow();
  });

  it('should validate invalid response size limit', () => {
    process.env.REST_RESPONSE_SIZE_LIMIT = 'invalid';
    
    expect(() => {
      new (ConfigManager as any)();
    }).toThrow();
  });

  it('should validate invalid HTTP port', () => {
    process.env.HTTP_SERVER_PORT = '99999';
    
    expect(() => {
      new (ConfigManager as any)();
    }).toThrow('HTTP_SERVER_PORT must be between 1 and 65535');
  });
});