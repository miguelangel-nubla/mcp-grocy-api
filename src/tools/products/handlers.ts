import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import apiClient from '../../api/client.js';

export class ProductToolHandlers extends BaseToolHandler {
  public getProducts: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { fields } = args || {};
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'fields parameter is required and must be a non-empty array of field names');
    }

    try {
      const response = await apiClient.get('/objects/products');
      const products = response.data || [];

      // Filter the response to only include requested fields
      const filteredData = Array.isArray(products) 
        ? products.map((item: any) => {
            const filtered: any = {};
            fields.forEach(field => {
              if (item.hasOwnProperty(field)) {
                filtered[field] = item[field];
              }
            });
            return filtered;
          })
        : products;

      return this.createSuccessResult(filteredData);
    } catch (error: any) {
      return this.createErrorResult(`Failed to get products: ${error.message}`);
    }
  };

  public getStockByProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productId } = args || {};
    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required');
    }
    
    try {
      const response = await apiClient.get(`/stock/products/${productId}/entries`);
      const stockEntries = response.data || [];

      // Define the fields we want to keep for each stock entry
      const entryFields = [
        'id',
        'amount',
        'best_before_date',
        'purchased_date',
        'stock_id',
        'note',
        'location_id'
      ];
      
      // Filter entries to only include essential fields
      const filteredEntries = Array.isArray(stockEntries) 
        ? stockEntries.map((entry: any) => {
            const filteredEntry = entryFields.reduce((filtered: any, field: string) => {
              if (entry.hasOwnProperty(field)) {
                filtered[field] = entry[field];
              }
              return filtered;
            }, {});
            return filteredEntry;
          })
        : [];

      return this.createSuccessResult(filteredEntries);
    } catch (error: any) {
      return this.createErrorResult(`Failed to get stock by product: ${error.message}`);
    }
  };

  public getPriceHistory: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productId } = args || {};
    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required');
    }
    
    return this.handleApiCall(`/stock/products/${productId}/price-history`, 'Get product price history');
  };

  public getProductGroups: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/product_groups', 'Get all product groups');
  };
}

export const productHandlers = new ProductToolHandlers();