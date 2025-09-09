import { ToolModule } from '../types.js';
import { stockToolDefinitions } from './definitions.js';
import { stockHandlers } from './handlers.js';

export const stockModule: ToolModule = {
  definitions: stockToolDefinitions,
  handlers: {
    get_stock: stockHandlers.getStock,
    get_stock_volatile: stockHandlers.getStockVolatile,
    get_stock_by_location: stockHandlers.getStockByLocation,
    inventory_product: stockHandlers.inventoryProduct,
    purchase_product: stockHandlers.purchaseProduct,
    consume_product: stockHandlers.consumeProduct,
    transfer_product: stockHandlers.transferProduct,
    open_product: stockHandlers.openProduct
  }
};

export * from './definitions.js';
export * from './handlers.js';