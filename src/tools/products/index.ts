import { ToolModule } from '../types.js';
import { productToolDefinitions } from './definitions.js';
import { productHandlers } from './handlers.js';

export const productModule: ToolModule = {
  definitions: productToolDefinitions,
  handlers: {
    get_products: productHandlers.getProducts,
    get_product_entries: productHandlers.getProductEntries,
    get_price_history: productHandlers.getPriceHistory,
    get_product_groups: productHandlers.getProductGroups
  }
};

export * from './definitions.js';
export * from './handlers.js';