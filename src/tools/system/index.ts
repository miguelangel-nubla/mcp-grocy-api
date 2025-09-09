import { ToolModule } from '../types.js';
import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import apiClient from '../../api/client.js';
import config from '../../config/environment.js';

export const systemToolDefinitions = [
  {
    name: 'get_locations',
    description: 'Get all storage locations from your Grocy instance. Use this to find location IDs and names when working with other tools that require locationId parameters.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'get_quantity_units',
    description: 'Get all quantity units from your Grocy instance.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'get_users',
    description: 'Get all users from your Grocy instance.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'get_chores',
    description: 'Get all chores from your Grocy instance.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'get_tasks',
    description: 'Get all tasks from your Grocy instance.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'get_batteries',
    description: 'Get all batteries from your Grocy instance.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'get_equipment',
    description: 'Get all equipment from your Grocy instance.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'call_grocy_api',
    description: 'Call a specific Grocy API endpoint with custom parameters.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        endpoint: {
          type: 'string',
          description: 'Grocy API endpoint to call (e.g., "objects/products"). Do not include /api/ prefix.'
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'HTTP method to use',
          default: 'GET'
        },
        body: {
          type: 'object',
          description: 'Optional request body for POST/PUT requests'
        }
      },
      required: ['endpoint']
    }
  },
  {
    name: 'test_request',
    description: `Test a REST API endpoint and get detailed response information. Base URL: ${config.getGrocyBaseUrl()} | SSL Verification ${config.get().GROCY_ENABLE_SSL_VERIFY ? 'enabled' : 'disabled'} (see config resource for SSL settings) | Authentication: ${config.hasApiKeyAuth() ? 'API Key using header: GROCY-API-KEY' : 'No authentication configured'}`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'HTTP method to use'
        },
        endpoint: {
          type: 'string',
          description: 'Endpoint path (e.g. "/users"). Do not include full URLs - only the path.'
        },
        body: {
          type: 'object',
          description: 'Optional request body for POST/PUT requests'
        },
        headers: {
          type: 'object',
          description: 'Optional request headers for one-time use.',
          additionalProperties: {
            type: 'string'
          }
        }
      },
      required: ['method', 'endpoint']
    }
  }
];

class SystemToolHandlers extends BaseToolHandler {
  public getLocations: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/locations', 'Get all storage locations');
  };

  public getQuantityUnits: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/quantity_units', 'Get all quantity units');
  };

  public getUsers: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/users', 'Get all users');
  };

  public getChores: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/chores', 'Get all chores');
  };

  public getTasks: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/tasks', 'Get all tasks');
  };

  public getBatteries: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/batteries', 'Get all batteries');
  };

  public getEquipment: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/equipment', 'Get all equipment');
  };

  public callGrocyApi: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { endpoint, method = 'GET', body = null } = args;
    
    if (!endpoint) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: endpoint');
    }

    // Remove leading /api/ if present
    const cleanEndpoint = endpoint.replace(/^\/?(?:api\/)?/, '');
    
    try {
      const response = await apiClient.request(`/${cleanEndpoint}`, {
        method,
        body
      });
      
      return this.createSuccessResult(response.data);
    } catch (error: any) {
      console.error(`Error calling Grocy API endpoint ${endpoint}:`, error);
      return this.createErrorResult(`Failed to call Grocy API endpoint ${endpoint}: ${error.message}`);
    }
  };

  public testRequest: ToolHandler = async (args: any): Promise<ToolResult> => {
    // This is a more complex handler that provides detailed request/response information
    // Implementation would be similar to the original handleTestRequest but simplified
    const { method, endpoint, body, headers = {} } = args;
    
    if (!method || !endpoint) {
      throw new McpError(ErrorCode.InvalidParams, 'method and endpoint are required');
    }

    const normalizedEndpoint = `/${endpoint.replace(/^\/+|\/+$/g, '')}`;
    
    try {
      const startTime = Date.now();
      const response = await apiClient.request(normalizedEndpoint, {
        method,
        body,
        headers
      });
      const endTime = Date.now();
      
      const responseObj = {
        request: {
          url: `${config.getGrocyBaseUrl()}${normalizedEndpoint}`,
          method,
          headers: { ...config.getCustomHeaders(), ...headers },
          body,
          authMethod: config.hasApiKeyAuth() ? 'apikey' : 'none'
        },
        response: {
          statusCode: response.status,
          timing: `${endTime - startTime}ms`,
          headers: response.headers,
          body: response.data
        },
        validation: {
          isError: response.status >= 400,
          messages: response.status >= 400 ? 
            [`Request failed with status ${response.status}`] : 
            ['Request completed successfully']
        }
      };

      return this.createSuccessResult(responseObj);
    } catch (error: any) {
      return this.createErrorResult(`Test request failed: ${error.message}`, {
        request: {
          url: `${config.getGrocyBaseUrl()}${normalizedEndpoint}`,
          method,
          headers: { ...config.getCustomHeaders(), ...headers },
          body
        }
      });
    }
  };
}

const systemHandlers = new SystemToolHandlers();

export const systemModule: ToolModule = {
  definitions: systemToolDefinitions,
  handlers: {
    get_locations: systemHandlers.getLocations,
    get_quantity_units: systemHandlers.getQuantityUnits,
    get_users: systemHandlers.getUsers,
    get_chores: systemHandlers.getChores,
    get_tasks: systemHandlers.getTasks,
    get_batteries: systemHandlers.getBatteries,
    get_equipment: systemHandlers.getEquipment,
    call_grocy_api: systemHandlers.callGrocyApi,
    test_request: systemHandlers.testRequest
  }
};