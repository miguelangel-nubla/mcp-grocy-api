import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export class ProductToolHandlers extends BaseToolHandler {
  public getProducts: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { fields } = args || {};
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'fields parameter is required and must be a non-empty array of field names');
    }

    const result = await this.handleApiCall('/objects/products', 'Get all products');
    
    if (result.isError || !result.content) {
      return result;
    }

    // Filter the response to only include requested fields
    const filteredData = Array.isArray(result.content) 
      ? result.content.map((item: any) => {
          const filtered: any = {};
          fields.forEach(field => {
            if (item.hasOwnProperty(field)) {
              filtered[field] = item[field];
            }
          });
          return filtered;
        })
      : result.content;

    return this.createSuccessResult(filteredData);
  };

  public getStockByProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productId } = args || {};
    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required');
    }
    
    const result = await this.handleApiCall(`/stock/products/${productId}/entries`, 'Get stock by product');
    
    if (result.isError || !result.content) {
      return result;
    }

    // Define the fields we want to keep for each stock entry
    const entryFields = [
      'id',
      'amount',
      'best_before_date',
      'purchased_date',
      'stock_id',
      'note'
    ];
    
    // Filter entries to only include essential fields
    const filteredEntries = Array.isArray(result.content) 
      ? result.content.map((entry: any) => {
          const filteredEntry = entryFields.reduce((filtered: any, field: string) => {
            filtered[field] = entry[field];
            return filtered;
          }, {});
          return filteredEntry;
        })
      : result.content;

    return this.createSuccessResult(filteredEntries);
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