import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StockToolHandlers } from '../src/tools/stock/handlers.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Mock API client
vi.mock('../src/api/client.js', () => ({
  default: {
    request: vi.fn(),
    get: vi.fn()
  },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  }
}));

import apiClient from '../src/api/client.js';
const mockApiClient = vi.mocked(apiClient);

describe('StockToolHandlers', () => {
  let handlers: StockToolHandlers;

  beforeEach(() => {
    handlers = new StockToolHandlers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getStock', () => {
    it('should call API with correct endpoint', async () => {
      const mockResponse = {
        data: [{ product_id: 1, amount: 10 }],
        status: 200,
        headers: {}
      };
      mockApiClient.request.mockResolvedValue(mockResponse);

      const result = await handlers.getAllStock({});

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock', {
        method: 'GET',
        body: null,
        headers: {},
        queryParams: {}
      });

      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse.data);
    });
  });

  describe('getStockVolatile', () => {
    it('should call API without details by default', async () => {
      const mockResponse = { data: { expired: [], due: [] }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      await handlers.getStockVolatile({});

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/volatile', {
        method: 'GET',
        body: null,
        headers: {},
        queryParams: {}
      });
    });

    it('should include details when requested', async () => {
      const mockResponse = { data: { expired: [], due: [] }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      await handlers.getStockVolatile({ includeDetails: true });

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/volatile', {
        method: 'GET',
        body: null,
        headers: {},
        queryParams: { include_details: 'true' }
      });
    });
  });

  describe('inventoryProduct', () => {
    it('should require productId and newAmount', async () => {
      await expect(handlers.inventoryProduct({})).rejects.toThrow(McpError);
      await expect(handlers.inventoryProduct({ productId: 1 })).rejects.toThrow(McpError);
      await expect(handlers.inventoryProduct({ newAmount: 10 })).rejects.toThrow(McpError);
    });

    it('should make inventory request with required params', async () => {
      const mockResponse = { data: { success: true }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      const args = {
        productId: 1,
        newAmount: 15,
        locationId: 2,
        note: 'Inventory check'
      };

      await handlers.inventoryProduct(args);

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/products/1/inventory', {
        method: 'POST',
        body: expect.objectContaining({
          new_amount: 15,
          location_id: 2,
          note: 'Inventory check',
          transaction_type: 'inventory-correction',
          best_before_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
        }),
        headers: {},
        queryParams: {}
      });
    });

    it('should use custom best before date when provided', async () => {
      const mockResponse = { data: { success: true }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      await handlers.inventoryProduct({
        productId: 1,
        newAmount: 10,
        bestBeforeDate: '2024-12-31'
      });

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/products/1/inventory', {
        method: 'POST',
        body: expect.objectContaining({
          best_before_date: '2024-12-31'
        }),
        headers: {},
        queryParams: {}
      });
    });
  });

  describe('purchaseProduct', () => {
    it('should require productId', async () => {
      await expect(handlers.purchaseProduct({})).rejects.toThrow(McpError);
      await expect(handlers.purchaseProduct({})).rejects.toThrow('productId is required');
    });

    it('should make purchase request with default amount', async () => {
      const mockResponse = { data: { success: true }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      await handlers.purchaseProduct({ productId: 1 });

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/products/1/add', {
        method: 'POST',
        body: expect.objectContaining({
          amount: 1,
          transaction_type: 'purchase',
          best_before_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
        }),
        headers: {},
        queryParams: {}
      });
    });

    it('should include optional parameters when provided', async () => {
      const mockResponse = { data: { success: true }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      const args = {
        productId: 1,
        amount: 3,
        price: 15.99,
        storeId: 2,
        locationId: 3,
        note: 'Bulk purchase'
      };

      await handlers.purchaseProduct(args);

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/products/1/add', {
        method: 'POST',
        body: expect.objectContaining({
          amount: 3,
          price: 15.99,
          shopping_location_id: 2,
          location_id: 3,
          note: 'Bulk purchase'
        }),
        headers: {},
        queryParams: {}
      });
    });
  });

  describe('consumeProduct', () => {
    it('should require stockId', async () => {
      await expect(handlers.consumeProduct({})).rejects.toThrow(McpError);
      await expect(handlers.consumeProduct({})).rejects.toThrow('stockId is required');
    });

    it('should make consume request with defaults', async () => {
      // Mock the stock entry lookup
      mockApiClient.get.mockResolvedValueOnce({
        data: { product_id: 1, stock_id: 123 },
        status: 200,
        headers: {}
      });
      
      const mockResponse = { data: { success: true }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      await handlers.consumeProduct({ stockId: 123, productId: 1, amount: 1 });

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/products/1/consume', {
        method: 'POST',
        body: expect.objectContaining({
          amount: 1,
          spoiled: false,
          stock_entry_id: 123
        }),
        headers: {},
        queryParams: {}
      });
    });

    it('should handle spoiled products', async () => {
      // Mock the stock entry lookup
      mockApiClient.get.mockResolvedValueOnce({
        data: { product_id: 1, stock_id: 123 },
        status: 200,
        headers: {}
      });
      
      const mockResponse = { data: { success: true }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      await handlers.consumeProduct({ 
        stockId: 123, 
        productId: 1,
        spoiled: true, 
        amount: 2 
      });

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/products/1/consume', {
        method: 'POST',
        body: expect.objectContaining({
          amount: 2,
          spoiled: true,
          stock_entry_id: 123
        }),
        headers: {},
        queryParams: {}
      });
    });
  });

  describe('transferProduct', () => {
    it('should require all location parameters', async () => {
      await expect(handlers.transferProduct({})).rejects.toThrow(McpError);
      await expect(handlers.transferProduct({ productId: 1 })).rejects.toThrow(McpError);
      await expect(handlers.transferProduct({ 
        productId: 1, 
        locationIdFrom: 1 
      })).rejects.toThrow(McpError);
    });

    it('should make transfer request', async () => {
      // Mock the stock entry lookup
      mockApiClient.get.mockResolvedValueOnce({
        data: { product_id: 1, location_id: 2, stock_id: 123 },
        status: 200,
        headers: {}
      });
      
      const mockResponse = { data: { success: true }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      const args = {
        stockId: 123,
        productId: 1,
        locationIdTo: 3,
        amount: 5,
        note: 'Moving to pantry'
      };

      await handlers.transferProduct(args);

      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/products/1/transfer', {
        method: 'POST',
        body: expect.objectContaining({
          amount: 5,
          location_id_from: 2,
          location_id_to: 3,
          note: 'Moving to pantry',
          transaction_type: 'transfer',
          stock_entry_id: 123
        }),
        headers: {},
        queryParams: {}
      });
    });
  });

  describe('openProduct', () => {
    it('should require stockId', async () => {
      await expect(handlers.openProduct({})).rejects.toThrow(McpError);
      await expect(handlers.openProduct({})).rejects.toThrow('stockId is required');
    });


    it('should resolve productId from stockId', async () => {
      // Mock the stock entry lookup
      mockApiClient.get.mockResolvedValueOnce({
        data: { product_id: 5, stock_id: 123 },
        status: 200,
        headers: {}
      });

      // Mock the actual open request
      const mockResponse = { data: { success: true }, status: 200, headers: {} };
      mockApiClient.request.mockResolvedValue(mockResponse);

      await handlers.openProduct({ stockId: 123, productId: 5, amount: 1 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/stock/entry/123');
      expect(mockApiClient.request).toHaveBeenCalledWith('/stock/products/5/open', {
        method: 'POST',
        body: expect.objectContaining({
          amount: 1,
          stock_entry_id: 123
        }),
        headers: {},
        queryParams: {}
      });
    });

    it('should handle stockId lookup failure', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Entry not found'));

      const result = await handlers.openProduct({ stockId: 999, productId: 1, amount: 1 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to open product');
      expect(result.content[0].text).toContain('Entry not found');
    });
  });
});