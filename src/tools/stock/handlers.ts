import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import apiClient from '../../api/client.js';
import Fuse from 'fuse.js';

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

  public lookupProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productName } = args || {};
    
    if (!productName) {
      throw new McpError(ErrorCode.InvalidParams, 'productName is required');
    }

    try {
      // Fetch all required data in parallel
      const [productsResponse, locationsResponse, quantityUnitsResponse] = await Promise.all([
        apiClient.get('/objects/products'),
        apiClient.get('/objects/locations'),
        apiClient.get('/objects/quantity_units')
      ]);

      const products = Array.isArray(productsResponse.data) ? productsResponse.data : [];
      const locations = Array.isArray(locationsResponse.data) ? locationsResponse.data : [];
      const quantityUnits = Array.isArray(quantityUnitsResponse.data) ? quantityUnitsResponse.data : [];

      // Configure Fuse.js for advanced fuzzy matching
      const fuseOptions = {
        keys: [
          { name: 'name', weight: 1.0 },
          { name: 'description', weight: 0.3 }
        ],
        threshold: 0.6, // Lower = more strict, higher = more permissive (0-1)
        distance: 100,   // How far to search for matches
        minMatchCharLength: 1,
        ignoreLocation: true, // Don't care where in the string the match is
        includeScore: true,
        includeMatches: true,
        useExtendedSearch: false,
        // Advanced options for handling accents, case, etc.
        isCaseSensitive: false,
        shouldSort: true,
        findAllMatches: false
      };

      // Create Fuse instance and search
      const fuse = new Fuse(products, fuseOptions);
      const fuseResults = fuse.search(productName);

      // Convert Fuse results to our format and add more permissive fallback
      let productMatches = fuseResults.map((result: any) => ({
        ...result.item,
        matchScore: Math.round((1 - result.score) * 100), // Convert Fuse score (lower=better) to percentage
        fuseScore: result.score,
        matches: result.matches
      }));

      // If no results with strict threshold, try more permissive search
      if (productMatches.length === 0) {
        const permissiveFuse = new Fuse(products, {
          ...fuseOptions,
          threshold: 0.8, // Much more permissive
          distance: 200
        });
        const permissiveResults = permissiveFuse.search(productName);
        productMatches = permissiveResults.map((result: any) => ({
          ...result.item,
          matchScore: Math.round((1 - result.score) * 100),
          fuseScore: result.score,
          matches: result.matches,
          isPermissiveMatch: true
        }));
      }

      // Take top 5 matches
      productMatches = productMatches.slice(0, 5);

      if (productMatches.length === 0) {
        return this.createErrorResult(`No products found matching "${productName}"`, {
          suggestion: 'Try a different product name or check the spelling',
          availableProducts: products.slice(0, 10).map((p: any) => p.name)
        });
      }

      // Get stock information for matching products
      const enrichedMatches = await Promise.all(productMatches.map(async (product: any) => {
        let productEntries: any[] = [];
        try {
          const entriesResponse = await apiClient.get(`/stock/products/${product.id}/entries`);
          productEntries = Array.isArray(entriesResponse.data) ? entriesResponse.data : [];
        } catch (error) {
          // If we can't get entries, continue with empty array
          productEntries = [];
        }

        const stockEntries = productEntries.map((stockItem: any) => {
          return {
            amount: stockItem.amount,
            bestBeforeDate: stockItem.best_before_date,
            stockId: stockItem.stock_id,
            locationId: parseInt(stockItem.location_id)
          };
        });

        // Sort entries by best before date (earliest first)
        stockEntries.sort((a: any, b: any) => {
          if (!a.bestBeforeDate && !b.bestBeforeDate) return 0;
          if (!a.bestBeforeDate) return 1; // No expiry goes last
          if (!b.bestBeforeDate) return -1; // No expiry goes last
          return new Date(a.bestBeforeDate).getTime() - new Date(b.bestBeforeDate).getTime();
        });

        const unit = quantityUnits.find((u: any) => u.id == product.qu_id_stock);
        const unitInfo = unit 
          ? { id: unit.id, name: unit.name }
          : { id: null, name: 'pieces' };

        const hasMultipleLocations = stockEntries.length > 1 && 
          new Set(stockEntries.map((entry: any) => entry.locationId)).size > 1;

        const locationInstructions = hasMultipleLocations 
          ? 'IMPORTANT: This product has stock in multiple locations. Make sure the user requested a specific location or confirm the locationId before performing any operations.'
          : undefined;

        return {
          productId: product.id,
          productName: product.name,
          stockEntries: stockEntries,
          totalStockAmount: productEntries.reduce((sum: number, s: any) => sum + parseFloat(s.amount || 0), 0),
          unit: unitInfo,
          locationInstructions
        };
      }));

      return this.createSuccessResult({
        message: `Found ${enrichedMatches.length} product matches for "${productName}" (ordered from most likely to least likely match)`,
        productMatches: enrichedMatches,
        allAvailableLocations: locations.map((l: any) => ({ id: l.id, name: l.name })),
        instructions: 'Review the matches above. Use the exact productId and locationId from this data for any product operations (consume_product, purchase_product, inventory_product, transfer_product, etc.).'
      });

    } catch (error: any) {
      return this.createErrorResult(`Failed to lookup product: ${error.message}`);
    }
  };
}

export const stockHandlers = new StockToolHandlers();