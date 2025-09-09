import axios, { AxiosInstance, AxiosRequestConfig, Method, AxiosError } from 'axios';
import https from 'https';
import config from '../config/environment.js';

export interface ApiRequestOptions {
  method?: Method;
  body?: any;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, any>;
}

export class ApiError extends Error {
  public status?: number;
  public response?: any;

  constructor(message: string, status?: number, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

export class GrocyApiClient {
  private axiosInstance: AxiosInstance;
  private readonly API_KEY_HEADER = 'GROCY-API-KEY';

  constructor() {
    const { GROCY_ENABLE_SSL_VERIFY, GROCY_APIKEY_VALUE } = config.get();
    
    this.axiosInstance = axios.create({
      baseURL: config.getGrocyBaseUrl(),
      validateStatus: () => true, // Allow any status code
      timeout: 30000, // 30 seconds timeout
      httpsAgent: GROCY_ENABLE_SSL_VERIFY ? undefined : new https.Agent({
        rejectUnauthorized: false
      })
    });

    // Set default authentication if available
    if (GROCY_APIKEY_VALUE) {
      this.axiosInstance.defaults.headers.common[this.API_KEY_HEADER] = GROCY_APIKEY_VALUE;
    }

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.error(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          console.error(`[API] Request body: ${JSON.stringify(config.data)}`);
        }
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        if (response.status >= 400) {
          console.error(`[API] Error response (${response.status}): ${JSON.stringify(response.data)}`);
        }
        return response;
      },
      (error) => {
        console.error('[API] Response error:', error);
        return Promise.reject(error);
      }
    );
  }

  private normalizeEndpoint(endpoint: string): string {
    // Standardize path handling
    let normalizedEndpoint = endpoint;
    
    // Check if endpoint explicitly starts with /api/ - use it as is
    if (endpoint.startsWith('/api/')) {
      normalizedEndpoint = endpoint;
    } 
    // Handle endpoints that start with api/ without leading slash
    else if (endpoint.startsWith('api/')) {
      normalizedEndpoint = `/${endpoint}`;
    }
    // All other endpoints - ensure they start with /api/
    else {
      if (endpoint.startsWith('/')) {
        normalizedEndpoint = `/api${endpoint}`;
      } else {
        normalizedEndpoint = `/api/${endpoint}`;
      }
    }
    
    console.error(`[API] Normalized endpoint: ${normalizedEndpoint}`);
    return normalizedEndpoint;
  }

  private buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  public async request<T = any>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body = null,
      headers = {},
      queryParams = {},
      timeout
    } = options;

    let url = this.normalizeEndpoint(endpoint);
    
    // Add query parameters
    if (Object.keys(queryParams).length > 0) {
      const queryString = this.buildQueryString(queryParams);
      url += `?${queryString}`;
    }

    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...config.getCustomHeaders(),
        ...headers
      },
      timeout
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && body !== null) {
      requestConfig.data = body;
    }

    try {
      const response = await this.axiosInstance.request(requestConfig);
      
      if (response.status >= 400) {
        throw new ApiError(
          `API error (${response.status}): ${JSON.stringify(response.data)}`,
          response.status,
          response.data
        );
      }
      
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, any>
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        if (axiosError.code === 'ECONNABORTED') {
          throw new ApiError('Connection timeout: The server took too long to respond');
        } else if (axiosError.code === 'ECONNRESET' || axiosError.message.includes('socket hang up')) {
          throw new ApiError('Connection reset: The server unexpectedly closed the connection');
        } else if (!axiosError.response) {
          throw new ApiError('Network error: Unable to reach the Grocy server');
        }
      }
      
      // Re-throw ApiError instances
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Wrap other errors
      throw new ApiError(`Request failed: ${error.message || error}`);
    }
  }

  // Convenience methods
  public async get<T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T = any>(endpoint: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public async put<T = any>(endpoint: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public async delete<T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public async patch<T = any>(endpoint: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }
}

// Export a singleton instance
export const apiClient = new GrocyApiClient();
export default apiClient;