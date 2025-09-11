import { ToolModule } from '../types.js';
import { stockToolDefinitions } from './definitions.js';
import { stockHandlers } from './handlers.js';

export const stockModule: ToolModule = {
  definitions: stockToolDefinitions,
  handlers: {
    get_all_stock: stockHandlers.getAllStock,
    get_stock_volatile: stockHandlers.getStockVolatile,
    get_stock_by_location: stockHandlers.getStockByLocation,
    inventory_product: stockHandlers.inventoryProduct,
    purchase_product: stockHandlers.purchaseProduct,
    consume_product: stockHandlers.consumeProduct,
    transfer_product: stockHandlers.transferProduct,
    open_product: stockHandlers.openProduct,
    lookup_product: stockHandlers.lookupProduct,
    print_stock_entry_label: stockHandlers.printStockEntryLabel
  }
};

export * from './definitions.js';
export * from './handlers.js';