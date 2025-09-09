import { ToolDefinition } from '../types.js';

export const stockToolDefinitions: ToolDefinition[] = [
  {
    name: 'get_stock',
    description: 'Get current stock from your Grocy instance.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_stock_volatile',
    description: 'Get volatile stock information (due products, overdue products, expired products, missing products).',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetails: {
          type: 'boolean',
          description: 'Whether to include additional details about each stock item'
        }
      },
      required: []
    }
  },
  {
    name: 'get_stock_by_location',
    description: 'Get all stock from a specific location in your Grocy instance. Use get_locations first to find the location ID.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'number',
          description: 'ID of the location to get stock for. Use get_locations tool to find available location IDs and names.'
        }
      },
      required: ['locationId']
    }
  },
  {
    name: 'inventory_product',
    description: 'Track a product inventory (set current stock amount). Use get_products to find the product ID and get_locations to find location IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'number',
          description: 'ID of the product to inventory. Use get_products tool to find the correct product ID by name.'
        },
        newAmount: {
          type: 'number',
          description: 'The new total amount in stock'
        },
        bestBeforeDate: {
          type: 'string',
          description: 'Best before date in YYYY-MM-DD format (default: today + 1 year)'
        },
        locationId: {
          type: 'number',
          description: 'ID of the storage location (optional). Use get_locations tool to find available location IDs and names.'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['productId', 'newAmount']
    }
  },
  {
    name: 'purchase_product',
    description: 'Track a product purchase in your Grocy instance. Use get_products to find product IDs, get_shopping_locations for store IDs, and get_locations for storage location IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'number',
          description: 'ID of the product to purchase. Use get_products tool to find the correct product ID by name.'
        },
        amount: {
          type: 'number',
          description: 'Amount to purchase (default: 1)',
          default: 1
        },
        bestBeforeDate: {
          type: 'string',
          description: 'Best before date in YYYY-MM-DD format (default: today + 1 year)'
        },
        price: {
          type: 'number',
          description: 'Price of the purchase (optional)'
        },
        storeId: {
          type: 'number',
          description: 'ID of the store where purchased (optional). Use get_shopping_locations tool to find available store IDs and names.'
        },
        locationId: {
          type: 'number',
          description: 'ID of the storage location (optional). Use get_locations tool to find available location IDs and names.'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'consume_product',
    description: 'Track consumption of a product in your Grocy instance. Use get_products to find product IDs, get_recipes for recipe IDs, and get_locations for location IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'number',
          description: 'ID of the product to consume. Use get_products tool to find the correct product ID by name.'
        },
        amount: {
          type: 'number',
          description: 'Amount to consume (default: 1)',
          default: 1
        },
        spoiled: {
          type: 'boolean',
          description: 'Whether the product is spoiled (default: false)',
          default: false
        },
        recipeId: {
          type: 'number',
          description: 'ID of the recipe if consuming for a recipe (optional). Use get_recipes tool to find recipe IDs by name.'
        },
        locationId: {
          type: 'number',
          description: 'ID of the location to consume from (optional). Use get_locations tool to find available location IDs and names.'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'transfer_product',
    description: 'Transfer a product from one location to another in your Grocy instance. Use get_products to find product IDs and get_locations to find location IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'number',
          description: 'ID of the product to transfer. Use get_products tool to find the correct product ID by name.'
        },
        amount: {
          type: 'number',
          description: 'Amount to transfer (default: 1)',
          default: 1
        },
        locationIdFrom: {
          type: 'number',
          description: 'ID of the source location (required). Use get_locations tool to find available location IDs and names.'
        },
        locationIdTo: {
          type: 'number', 
          description: 'ID of the destination location (required). Use get_locations tool to find available location IDs and names.'
        },
        note: {
          type: 'string',
          description: 'Optional note for this transfer'
        }
      },
      required: ['productId', 'locationIdFrom', 'locationIdTo']
    }
  },
  {
    name: 'open_product',
    description: 'Mark a product as opened in your Grocy instance. Use get_products to find product IDs or get_product_entries for specific stock entry IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'number',
          description: 'ID of the product to mark as opened (alternative to stockEntryId). Use get_products tool to find the correct product ID by name.'
        },
        stockEntryId: {
          type: 'number',
          description: 'ID of the specific stock entry to mark as opened (more precise than productId). Use get_product_entries tool to find specific stock entries for a product.'
        },
        amount: {
          type: 'number',
          description: 'Amount to mark as opened (default: 1)',
          default: 1
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: []
    }
  }
];