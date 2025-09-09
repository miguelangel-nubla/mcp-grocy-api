import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import apiClient from '../../api/client.js';

export class StockToolHandlers extends BaseToolHandler {
  public getStock: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/stock', 'Get current stock');
  };

  public getStockVolatile: ToolHandler = async (args: any): Promise<ToolResult> => {
    const queryParams = args?.includeDetails ? { include_details: 'true' } : {};
    return this.handleApiCall('/api/stock/volatile', 'Get volatile stock information', { queryParams });
  };

  public getStockByLocation: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { locationId } = args || {};
    if (!locationId) {
      throw new McpError(ErrorCode.InvalidParams, 'locationId is required');
    }
    
    return this.handleApiCall(`stock`, 'Get stock by location', {
      queryParams: { location_id: locationId.toString() }
    });
  };

  public inventoryProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productId, newAmount, bestBeforeDate, locationId, note } = args || {};
    
    if (!productId || newAmount === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'productId and newAmount are required');
    }

    // Default best before date is one year from now if not provided
    const defaultBBD = new Date();
    defaultBBD.setFullYear(defaultBBD.getFullYear() + 1);
    const formattedBBD = bestBeforeDate || defaultBBD.toISOString().split('T')[0];
    
    const body: Record<string, any> = {
      new_amount: newAmount,
      best_before_date: formattedBBD,
      transaction_type: 'inventory-correction'
    };
    
    if (locationId) body.location_id = locationId;
    if (note) body.note = note;
    
    return this.handleApiCall(`/stock/products/${productId}/inventory`, 'Inventory product', {
      method: 'POST',
      body
    });
  };

  public purchaseProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { 
      productId, 
      amount = 1, 
      bestBeforeDate, 
      price, 
      storeId, 
      locationId, 
      note 
    } = args || {};
    
    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required');
    }
    
    // Default best before date is one year from now if not provided
    const defaultBBD = new Date();
    defaultBBD.setFullYear(defaultBBD.getFullYear() + 1);
    const formattedBBD = bestBeforeDate || defaultBBD.toISOString().split('T')[0];
    
    const body: Record<string, any> = {
      amount,
      transaction_type: 'purchase',
      best_before_date: formattedBBD
    };
    
    if (price !== undefined) body.price = price;
    if (storeId) body.shopping_location_id = storeId;
    if (locationId) body.location_id = locationId;
    if (note) body.note = note;
    
    return this.handleApiCall(`/stock/products/${productId}/add`, 'Purchase product', {
      method: 'POST',
      body
    });
  };

  public consumeProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { 
      productId, 
      amount = 1, 
      spoiled = false, 
      recipeId, 
      locationId, 
      note 
    } = args || {};
    
    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required');
    }
    
    const body: Record<string, any> = {
      amount,
      transaction_type: spoiled ? 'consume-spoiled' : 'consume',
      spoiled
    };
    
    if (recipeId) body.recipe_id = recipeId;
    if (locationId) body.location_id = locationId;
    if (note) body.note = note;
    
    return this.handleApiCall(`/stock/products/${productId}/consume`, 'Consume product', {
      method: 'POST',
      body
    });
  };

  public transferProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productId, amount = 1, locationIdFrom, locationIdTo, note } = args || {};
    
    if (!productId || !locationIdFrom || !locationIdTo) {
      throw new McpError(ErrorCode.InvalidParams, 'productId, locationIdFrom, and locationIdTo are required');
    }
    
    const body: Record<string, any> = {
      amount,
      location_id_from: locationIdFrom,
      location_id_to: locationIdTo,
      transaction_type: 'transfer'
    };
    
    if (note) body.note = note;
    
    return this.handleApiCall(`/stock/products/${productId}/transfer`, 'Transfer product', {
      method: 'POST',
      body
    });
  };

  public openProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productId, stockEntryId, amount = 1, note } = args;
    
    if (!productId && !stockEntryId) {
      throw new McpError(ErrorCode.InvalidParams, 'Either productId or stockEntryId must be provided');
    }

    const body: any = { amount };
    if (note) body.note = note;
    if (stockEntryId) body.stock_entry_id = stockEntryId;
    
    try {
      let targetProductId = productId;
      
      // If we don't have a productId but have a stockEntryId, fetch the product ID first
      if (!productId && stockEntryId) {
        console.error(`No product ID provided but stock entry ID ${stockEntryId} given. Attempting to get product ID from stock entry.`);
        
        try {
          const response = await apiClient.get(`/api/stock/entry/${stockEntryId}`);
          if (response.data && response.data.product_id) {
            targetProductId = response.data.product_id;
            console.error(`Successfully resolved product ID ${targetProductId} from stock entry ${stockEntryId}`);
          } else {
            throw new Error(`Could not resolve product ID from stock entry ${stockEntryId}`);
          }
        } catch (error: any) {
          console.error(`Failed to get product ID from stock entry: ${error.message}`);
          throw new Error(`Failed to get product ID from stock entry: ${error.message}`);
        }
      }
      
      if (!targetProductId) {
        throw new Error('Unable to determine product ID for open operation');
      }
      
      return this.handleApiCall(`/api/stock/products/${targetProductId}/open`, 'Open product', {
        method: 'POST',
        body
      });
    } catch (error: any) {
      console.error('Error opening product:', error);
      return this.createErrorResult(`Failed to open product: ${error.message}`, {
        help: "When using productId, Grocy will automatically use first-in-first-out for stock selection. For more precise control, use stockEntryId instead. To find valid stock entry IDs, use the get_product_entries tool with your productId.",
        example: "Try using the get_product_entries tool with the product ID to find valid stock entries for a specific product"
      });
    }
  };
}

export const stockHandlers = new StockToolHandlers();