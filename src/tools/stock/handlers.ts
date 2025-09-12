import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import apiClient from '../../api/client.js';
import Fuse from 'fuse.js';

export class StockToolHandlers extends BaseToolHandler {
  public async splitStockEntry(
    originalEntry: any,
    stockAmounts: number[],
    getUnitForm: (amount: number) => string
  ): Promise<{ stockId: any; amount: number; type: string; unit: string }[]> {
    const splitEntries: { stockId: any; amount: number; type: string; unit: string }[] = [];

    if (stockAmounts.length === 1) {
      const note = `${originalEntry.note} - ${originalEntry.id} - 1`;
      await apiClient.put(`/stock/entry/${originalEntry.id}`, {
        amount: stockAmounts[0],
        open: false,
        note: note,
        best_before_date: originalEntry.best_before_date,
        purchased_date: originalEntry.purchased_date,
        location_id: originalEntry.location_id
      });
      splitEntries.push({
        stockId: originalEntry.id,
        amount: stockAmounts[0],
        type: 'updated',
        unit: getUnitForm(stockAmounts[0])
      });
    } else {
      for (let i = 0; i < stockAmounts.length; i++) {
        const amount = stockAmounts[i];
        const note = `${originalEntry.note} - ${originalEntry.id} - ${i + 1}`;

        if (i === 0) {
          await apiClient.put(`/stock/entry/${originalEntry.id}`, {
            amount: amount,
            open: false,
            note: note,
            best_before_date: originalEntry.best_before_date,
            purchased_date: originalEntry.purchased_date,
            location_id: originalEntry.location_id
          });
          splitEntries.push({
            stockId: originalEntry.id,
            amount,
            type: 'updated',
            unit: getUnitForm(amount)
          });
        } else {
          const createResponse = await apiClient.post(`/stock/products/${originalEntry.product_id}/add`, {
            amount,
            best_before_date: originalEntry.best_before_date,
            purchased_date: originalEntry.purchased_date,
            transaction_type: 'purchase',
            location_id: originalEntry.location_id,
            note: note
          });

          const stockId = createResponse.data[0].stock_id || createResponse.data[0].id;
          const stockResponse = await apiClient.get('/objects/stock');
          const stockEntries = Array.isArray(stockResponse.data) ? stockResponse.data : [];

          const actualStockEntry = stockEntries.find((entry: any) =>
            entry.product_id === originalEntry.product_id &&
            entry.stock_id === stockId
          );

          if (!actualStockEntry) {
            throw new Error(`Could not find created stock entry with product_id ${originalEntry.product_id} and stock_id ${stockId}`);
          }

          splitEntries.push({
            stockId: actualStockEntry.id,
            amount,
            type: 'created',
            unit: getUnitForm(amount)
          });
        }
      }
    }

    return splitEntries;
  }

  public getAllStock: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/stock', 'Get current stock');
  };

  public getStockVolatile: ToolHandler = async (args: any): Promise<ToolResult> => {
    const queryParams = args?.includeDetails ? { include_details: 'true' } : {};
    return this.handleApiCall('/stock/volatile', 'Get volatile stock information', { queryParams });
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
    const { productId, amount = 1, bestBeforeDate, price, storeId, locationId, note } = args || {};
    
    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required');
    }
    
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
    const { stockId, productId, amount, spoiled = false, note } = args || {};

    if (!stockId) {
      throw new McpError(ErrorCode.InvalidParams, 'stockId is required. Use get_stock_by_product or get_stock_by_location to find specific stockId values.');
    }

    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required.');
    }

    if (amount === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'amount is required');
    }

    try {
      const stockEntryResponse = await apiClient.get(`/stock/entry/${stockId}`);
      if (!stockEntryResponse.data || !stockEntryResponse.data.product_id) {
        throw new Error(`Could not resolve product ID from stock entry ${stockId}`);
      }

      if (stockEntryResponse.data.product_id !== productId) {
        throw new Error(`Product ID mismatch: stock entry ${stockId} belongs to product ${stockEntryResponse.data.product_id}, but ${productId} was provided`);
      }

      const body: Record<string, any> = {
        amount,
        spoiled,
        stock_entry_id: stockEntryResponse.data.stock_id,
        location_id: stockEntryResponse.data.location_id
      };

      if (note) body.note = note;

      return this.handleApiCall(`/stock/products/${stockEntryResponse.data.product_id}/consume`, 'Consume product', {
        method: 'POST',
        body
      });
    } catch (error: any) {
      return this.createErrorResult(`Failed to consume product: ${error.message}`);
    }
  };

  public transferProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { stockId, productId, amount, locationIdTo, note } = args || {};

    if (!stockId) {
      throw new McpError(ErrorCode.InvalidParams, 'stockId is required. Use get_stock_by_product or get_stock_by_location to find specific stockId values.');
    }

    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required.');
    }

    if (amount === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'amount is required');
    }

    try {
      const stockEntryResponse = await apiClient.get(`/stock/entry/${stockId}`);
      if (!stockEntryResponse.data || !stockEntryResponse.data.product_id) {
        throw new Error(`Could not resolve product ID from stock entry ${stockId}`);
      }

      if (stockEntryResponse.data.product_id !== productId) {
        throw new Error(`Product ID mismatch: stock entry ${stockId} belongs to product ${stockEntryResponse.data.product_id}, but ${productId} was provided`);
      }

      const body: Record<string, any> = {
        amount,
        location_id_from: stockEntryResponse.data.location_id,
        location_id_to: locationIdTo,
        transaction_type: 'transfer',
        stock_entry_id: stockEntryResponse.data.stock_id
      };

      if (note) body.note = note;

      return this.handleApiCall(`/stock/products/${stockEntryResponse.data.product_id}/transfer`, 'Transfer product', {
        method: 'POST',
        body
      });
    } catch (error: any) {
      return this.createErrorResult(`Failed to transfer product: ${error.message}`);
    }
  };

  public openProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { stockId, productId, amount, note } = args;

    if (!stockId) {
      throw new McpError(ErrorCode.InvalidParams, 'stockId is required. Use get_stock_by_product tool to find specific stockId values.');
    }

    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required.');
    }

    if (amount === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'amount is required');
    }

    try {
      const stockEntryResponse = await apiClient.get(`/stock/entry/${stockId}`);
      if (!stockEntryResponse.data || !stockEntryResponse.data.product_id) {
        throw new Error(`Could not resolve product ID from stock entry ${stockId}`);
      }

      if (stockEntryResponse.data.product_id !== productId) {
        throw new Error(`Product ID mismatch: stock entry ${stockId} belongs to product ${stockEntryResponse.data.product_id}, but ${productId} was provided`);
      }

      const body: any = {
        amount,
        stock_entry_id: stockEntryResponse.data.stock_id,
        location_id: stockEntryResponse.data.location_id
      };
      if (note) body.note = note;

      return this.handleApiCall(`/stock/products/${stockEntryResponse.data.product_id}/open`, 'Open product', {
        method: 'POST',
        body
      });
    } catch (error: any) {
      console.error('Error opening product:', error);
      return this.createErrorResult(`Failed to open product: ${error.message}`, {
        help: "Use get_stock_by_product tool to find valid stockId values for a specific product.",
        example: "Try using get_stock_by_product with a product ID to find valid stock entries"
      });
    }
  };

  public lookupProduct: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productName } = args || {};
    
    if (!productName) {
      throw new McpError(ErrorCode.InvalidParams, 'productName is required');
    }

    try {
      const [productsResponse, locationsResponse, quantityUnitsResponse] = await Promise.all([
        apiClient.get('/objects/products'),
        apiClient.get('/objects/locations'),
        apiClient.get('/objects/quantity_units')
      ]);

      const products = Array.isArray(productsResponse.data) ? productsResponse.data : [];
      const locations = Array.isArray(locationsResponse.data) ? locationsResponse.data : [];
      const quantityUnits = Array.isArray(quantityUnitsResponse.data) ? quantityUnitsResponse.data : [];

      const fuseOptions = {
        keys: [
          { name: 'name', weight: 1.0 },
          { name: 'description', weight: 0.3 }
        ],
        threshold: 0.6,
        distance: 100,
        minMatchCharLength: 1,
        ignoreLocation: true,
        includeScore: true,
        includeMatches: true,
        useExtendedSearch: false,
        isCaseSensitive: false,
        shouldSort: true,
        findAllMatches: false
      };

      const fuse = new Fuse(products, fuseOptions);
      const fuseResults = fuse.search(productName);

      let productMatches = fuseResults.map((result: any) => ({
        ...result.item,
        matchScore: Math.round((1 - result.score) * 100),
        fuseScore: result.score,
        matches: result.matches
      }));

      if (productMatches.length === 0) {
        const permissiveFuse = new Fuse(products, {
          ...fuseOptions,
          threshold: 0.8,
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

      productMatches = productMatches.slice(0, 5);

      if (productMatches.length === 0) {
        return this.createErrorResult(`No products found matching "${productName}"`, {
          suggestion: 'Try a different product name or check the spelling',
          availableProducts: products.slice(0, 10).map((p: any) => p.name)
        });
      }

      const enrichedMatches = await Promise.all(productMatches.map(async (product: any) => {
        let productEntries: any[] = [];
        try {
          const entriesResponse = await apiClient.get(`/stock/products/${product.id}/entries`);
          productEntries = Array.isArray(entriesResponse.data) ? entriesResponse.data : [];
        } catch {
          productEntries = [];
        }

        const stockEntries = productEntries.map((stockItem: any) => {
          return {
            amount: stockItem.amount,
            bestBeforeDate: stockItem.best_before_date,
            stockId: stockItem.id,
            locationId: parseInt(stockItem.location_id)
          };
        });

        stockEntries.sort((a: any, b: any) => {
          if (!a.bestBeforeDate && !b.bestBeforeDate) return 0;
          if (!a.bestBeforeDate) return 1;
          if (!b.bestBeforeDate) return -1;
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

  public printStockEntryLabel: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { stockId, productId } = args || {};

    if (!stockId) {
      throw new McpError(ErrorCode.InvalidParams, 'stockId is required. Use get_stock_by_product tool to find specific stockId values.');
    }

    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required.');
    }

    try {
      const stockEntryResponse = await apiClient.get(`/stock/entry/${stockId}`);
      if (!stockEntryResponse.data || !stockEntryResponse.data.product_id) {
        throw new Error(`Could not resolve product ID from stock entry ${stockId}`);
      }

      if (stockEntryResponse.data.product_id !== productId) {
        throw new Error(`Product ID mismatch: stock entry ${stockId} belongs to product ${stockEntryResponse.data.product_id}, but ${productId} was provided`);
      }

      return this.handleApiCall(`/stock/entry/${stockId}/printlabel`, 'Print stock entry label');
    } catch (error: any) {
      console.error('Error printing stock entry label:', error);
      return this.createErrorResult(`Failed to print stock entry label: ${error.message}`, {
        help: "Use get_stock_by_product tool to find valid stockId values for a specific product.",
        example: "Try using get_stock_by_product with a product ID to find valid stock entries"
      });
    }
  };
}

export const stockHandlers = new StockToolHandlers();
