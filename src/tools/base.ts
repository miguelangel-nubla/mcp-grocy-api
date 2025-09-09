import { ToolResult } from './types.js';
import apiClient, { ApiError } from '../api/client.js';

export abstract class BaseToolHandler {
  protected safeJsonStringify(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error stringifying JSON:', error);
      return JSON.stringify({ error: 'Error formatting response data' }, null, 2);
    }
  }

  protected createSuccessResult(data: any): ToolResult {
    return {
      content: [{
        type: 'text',
        text: this.safeJsonStringify(data)
      }]
    };
  }

  protected createErrorResult(error: string | Error, context?: any): ToolResult {
    const errorMessage = error instanceof Error ? error.message : error;
    const result: any = { error: errorMessage };
    
    if (context) {
      result.context = context;
    }

    return {
      content: [{
        type: 'text',
        text: this.safeJsonStringify(result)
      }],
      isError: true
    };
  }

  protected async handleApiCall(
    endpoint: string, 
    description: string, 
    options: any = {}
  ): Promise<ToolResult> {
    try {
      const method = options.method || 'GET';
      const body = options.body || null;
      const headers = options.headers || {};
      const queryParams = options.queryParams || {};

      const response = await apiClient.request(endpoint, {
        method,
        body,
        headers,
        queryParams
      });

      return this.createSuccessResult(response.data);
    } catch (error: any) {
      console.error(`Error in ${description}:`, error);
      
      if (error instanceof ApiError) {
        return this.createErrorResult(`Failed to ${description.toLowerCase()}: ${error.message}`);
      }
      
      return this.createErrorResult(`Failed to ${description.toLowerCase()}: ${error.message || error}`);
    }
  }
}