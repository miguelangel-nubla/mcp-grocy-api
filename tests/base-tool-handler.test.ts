import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseToolHandler } from '../src/tools/base.js';
import { ApiError } from '../src/api/client.js';

// Mock API client
vi.mock('../src/api/client.js', () => ({
  default: {
    request: vi.fn()
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }
}));

import apiClient from '../src/api/client.js';
const mockApiClient = vi.mocked(apiClient);

class TestToolHandler extends BaseToolHandler {
  public testSafeJsonStringify(data: any) {
    return this.safeJsonStringify(data);
  }

  public testCreateSuccessResult(data: any) {
    return this.createSuccessResult(data);
  }

  public testCreateErrorResult(error: string | Error, context?: any) {
    return this.createErrorResult(error, context);
  }

  public testHandleApiCall(endpoint: string, description: string, options?: any) {
    return this.handleApiCall(endpoint, description, options);
  }
}

describe('BaseToolHandler', () => {
  let handler: TestToolHandler;

  beforeEach(() => {
    handler = new TestToolHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('safeJsonStringify', () => {
    it('should stringify normal objects', () => {
      const data = { test: 'value', number: 42 };
      const result = handler.testSafeJsonStringify(data);
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      // Should not throw, should return error object
      const result = handler.testSafeJsonStringify(circular);
      expect(result).toContain('Error formatting response data');
    });

    it('should handle undefined and null', () => {
      expect(handler.testSafeJsonStringify(null)).toBe('null');
      expect(handler.testSafeJsonStringify(undefined)).toBe(undefined);
    });
  });

  describe('createSuccessResult', () => {
    it('should create success result with correct format', () => {
      const data = { success: true, data: 'test' };
      const result = handler.testCreateSuccessResult(data);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      });
    });

    it('should handle complex data structures', () => {
      const data = {
        array: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        boolean: true
      };
      const result = handler.testCreateSuccessResult(data);
      
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(data);
    });
  });

  describe('createErrorResult', () => {
    it('should create error result from string', () => {
      const errorMessage = 'Something went wrong';
      const result = handler.testCreateErrorResult(errorMessage);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }],
        isError: true
      });
    });

    it('should create error result from Error object', () => {
      const error = new Error('Test error');
      const result = handler.testCreateErrorResult(error);
      
      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Test error' }, null, 2)
        }],
        isError: true
      });
    });

    it('should include context when provided', () => {
      const context = { endpoint: '/test', params: { id: 123 } };
      const result = handler.testCreateErrorResult('Error occurred', context);
      
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'Error occurred',
        context
      });
    });
  });

  describe('handleApiCall', () => {
    it('should make successful API call', async () => {
      const responseData = { result: 'success' };
      mockApiClient.request.mockResolvedValue({
        data: responseData,
        status: 200,
        headers: {}
      });

      const result = await handler.testHandleApiCall('/test', 'Test operation');

      expect(mockApiClient.request).toHaveBeenCalledWith('/test', {
        method: 'GET',
        body: null,
        headers: {},
        queryParams: {}
      });

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify(responseData, null, 2)
        }]
      });
    });

    it('should handle POST requests with body', async () => {
      const requestBody = { name: 'test', value: 42 };
      const responseData = { created: true };
      
      mockApiClient.request.mockResolvedValue({
        data: responseData,
        status: 201,
        headers: {}
      });

      const result = await handler.testHandleApiCall('/test', 'Create test', {
        method: 'POST',
        body: requestBody,
        headers: { 'Custom-Header': 'value' },
        queryParams: { param: 'value' }
      });

      expect(mockApiClient.request).toHaveBeenCalledWith('/test', {
        method: 'POST',
        body: requestBody,
        headers: { 'Custom-Header': 'value' },
        queryParams: { param: 'value' }
      });
    });

    it('should handle ApiError', async () => {
      const apiError = new ApiError('API request failed', 404);
      mockApiClient.request.mockRejectedValue(apiError);

      const result = await handler.testHandleApiCall('/test', 'Test operation');

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify({ 
            error: 'Failed to test operation: API request failed' 
          }, null, 2)
        }],
        isError: true
      });
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Network error');
      mockApiClient.request.mockRejectedValue(genericError);

      const result = await handler.testHandleApiCall('/test', 'Test operation');

      expect(result).toEqual({
        content: [{
          type: 'text',
          text: JSON.stringify({ 
            error: 'Failed to test operation: Network error' 
          }, null, 2)
        }],
        isError: true
      });
    });

    it('should use default options when not provided', async () => {
      mockApiClient.request.mockResolvedValue({
        data: {},
        status: 200,
        headers: {}
      });

      await handler.testHandleApiCall('/test', 'Test operation');

      expect(mockApiClient.request).toHaveBeenCalledWith('/test', {
        method: 'GET',
        body: null,
        headers: {},
        queryParams: {}
      });
    });
  });
});