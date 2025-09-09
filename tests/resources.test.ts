import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceHandler } from '../src/server/resources.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    promises: {
      readFile: vi.fn()
    }
  },
  promises: {
    readFile: vi.fn()
  }
}));

// Mock path and url modules
vi.mock('path');
vi.mock('url', () => ({
  fileURLToPath: vi.fn().mockReturnValue('/mocked/path/to/file.js')
}));

import fs from 'fs';
const mockFs = vi.mocked(fs.promises);
const mockPath = vi.mocked(path);

describe('ResourceHandler', () => {
  let resourceHandler: ResourceHandler;

  beforeEach(() => {
    resourceHandler = new ResourceHandler();
    vi.clearAllMocks();
    
    // Mock path.dirname to return a predictable directory
    mockPath.dirname.mockReturnValue('/mocked/server');
    mockPath.join.mockImplementation((...segments) => segments.join('/'));
  });

  describe('listResources', () => {
    it('should return list of available resources', async () => {
      const result = await resourceHandler.listResources();
      
      expect(result).toEqual({
        resources: [
          {
            uri: 'grocy-api://examples',
            name: 'Grocy API Usage Examples',
            description: 'Detailed examples of using the Grocy API',
            mimeType: 'text/markdown'
          },
          {
            uri: 'grocy-api://response-format',
            name: 'Response Format Documentation',
            description: 'Documentation of the response format and structure',
            mimeType: 'text/markdown'
          },
          {
            uri: 'grocy-api://config',
            name: 'Configuration Documentation',
            description: 'Documentation of all configuration options and how to use them',
            mimeType: 'text/markdown'
          }
        ]
      });
    });
  });

  describe('readResource', () => {
    it('should read valid resource successfully', async () => {
      const mockContent = '# Test Resource\n\nThis is a test markdown content.';
      mockFs.readFile.mockResolvedValue(mockContent);

      const result = await resourceHandler.readResource('grocy-api://config');

      expect(mockPath.join).toHaveBeenCalledWith(
        '/mocked/server',
        '../resources',
        'config.md'
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/mocked/server/../resources/config.md',
        'utf8'
      );
      expect(result).toEqual({
        contents: [{
          uri: 'grocy-api://config',
          mimeType: 'text/markdown',
          text: mockContent
        }]
      });
    });

    it('should handle invalid URI format', async () => {
      await expect(resourceHandler.readResource('invalid://format'))
        .rejects.toThrow(McpError);
      
      await expect(resourceHandler.readResource('invalid://format'))
        .rejects.toThrow('Invalid resource URI format');
    });

    it('should handle non-grocy-api URI', async () => {
      await expect(resourceHandler.readResource('other-service://config'))
        .rejects.toThrow(McpError);
    });

    it('should handle file not found', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(resourceHandler.readResource('grocy-api://nonexistent'))
        .rejects.toThrow(McpError);
      
      await expect(resourceHandler.readResource('grocy-api://nonexistent'))
        .rejects.toThrow('Resource not found: nonexistent');
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      await expect(resourceHandler.readResource('grocy-api://examples'))
        .rejects.toThrow(McpError);
      
      await expect(resourceHandler.readResource('grocy-api://examples'))
        .rejects.toThrow('Resource not found: examples');
    });

    it('should extract resource name from URI correctly', async () => {
      const mockContent = 'Mock content';
      mockFs.readFile.mockResolvedValue(mockContent);

      await resourceHandler.readResource('grocy-api://response-format');
      
      expect(mockPath.join).toHaveBeenCalledWith(
        '/mocked/server',
        '../resources',
        'response-format.md'
      );
    });
  });

  describe('URI parsing', () => {
    it('should validate URI patterns correctly', async () => {
      // Mock file read for valid URIs to succeed
      mockFs.readFile.mockResolvedValue('test content');

      // Test valid URIs (should not throw URI format errors)
      const validUris = [
        'grocy-api://config',
        'grocy-api://examples', 
        'grocy-api://response-format',
        'grocy-api://some-other-resource'
      ];

      for (const uri of validUris) {
        await expect(resourceHandler.readResource(uri)).resolves.toBeDefined();
      }

      // Test invalid URIs (should throw URI format errors)
      const invalidUris = [
        'grocy-api://',
        'wrong-service://config',
        'http://example.com',
        'config',
        ''
      ];

      for (const uri of invalidUris) {
        await expect(resourceHandler.readResource(uri))
          .rejects.toThrow('Invalid resource URI format');
      }
    });
  });
});