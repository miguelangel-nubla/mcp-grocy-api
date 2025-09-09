import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export class ProductToolHandlers extends BaseToolHandler {
  public getProducts: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/products', 'Get all products');
  };

  public getProductEntries: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productId } = args || {};
    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required');
    }
    
    return this.handleApiCall(`/stock/products/${productId}/entries`, 'Get product entries');
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