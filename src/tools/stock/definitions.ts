import { ToolDefinition } from '../types.js';

export const stockToolDefinitions: ToolDefinition[] = [
  {
    name: 'get_all_stock',
    description: 'Get all stock entries from every location in your Grocy instance. This returns the complete stock database with detailed information including stock entry IDs.',
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
    description: 'Get stock entries from a specific location in your Grocy instance.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: {
          type: 'number',
          description: 'ID of the location to get stock for.'
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
          description: 'The new total amount in stock in the product\'s stock unit (e.g., 5 pieces, 2.5 kg, 1000 ml). Ensure you know the product\'s stock unit before specifying amount.'
        },
        bestBeforeDate: {
          type: 'string',
          description: 'Best before date in YYYY-MM-DD format (default: today + 1 year)'
        },
        locationId: {
          type: 'number',
          description: 'ID of the storage location. Use get_locations tool to find available location IDs and names.'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['productId', 'newAmount', 'locationId']
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
          description: 'Amount to purchase in the product\'s stock unit (e.g., 1 piece, 2.5 kg, 500 ml). Ensure you know the product\'s stock unit before specifying amount.'
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
          description: 'ID of the storage location. Use get_locations tool to find available location IDs and names.'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['productId', 'amount', 'locationId']
    }
  },
  {
    name: 'consume_product',
    description: 'Track consumption of a specific stock entry in your Grocy instance.',
    inputSchema: {
      type: 'object',
      properties: {
        stockId: {
          type: 'number',
          description: 'ID of the specific stock entry to consume.'
        },
        productId: {
          type: 'number',
          // ProductId is required for verification - if user knows the stockId, they must know the productId.
          // This ensures the call is made to the correct stock entry and prevents accidental operations.
          description: 'ID of the product being consumed.'
        },
        amount: {
          type: 'number',
          description: 'Amount to consume in the product\'s stock unit (e.g., 1 piece, 0.5 kg, 250 ml). Ensure you know the product\'s stock unit before specifying amount.'
        },
        spoiled: {
          type: 'boolean',
          description: 'Whether the product is spoiled (default: false)',
          default: false
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['stockId', 'productId', 'amount']
    }
  },
  {
    name: 'transfer_product',
    description: 'Transfer a specific stock entry to another location in your Grocy instance.',
    inputSchema: {
      type: 'object',
      properties: {
        stockId: {
          type: 'number',
          description: 'ID of the specific stock entry to transfer.'
        },
        productId: {
          type: 'number',
          // ProductId is required for verification - if user knows the stockId, they must know the productId.
          // This ensures the call is made to the correct stock entry and prevents accidental operations.
          description: 'ID of the product being transferred.'
        },
        amount: {
          type: 'number',
          description: 'Amount to transfer in the product\'s stock unit (e.g., 1 piece, 0.5 kg, 250 ml). Ensure you know the product\'s stock unit before specifying amount.'
        },
        locationIdTo: {
          type: 'number', 
          description: 'ID of the destination location.'
        },
        note: {
          type: 'string',
          description: 'Optional note for this transfer'
        }
      },
      required: ['stockId', 'productId', 'amount', 'locationIdTo']
    }
  },
  {
    name: 'open_product',
    description: 'Mark a specific stock entry as opened in your Grocy instance.',
    inputSchema: {
      type: 'object',
      properties: {
        stockId: {
          type: 'number',
          description: 'ID of the specific stock entry to mark as opened.'
        },
        productId: {
          type: 'number',
          // ProductId is required for verification - if user knows the stockId, they must know the productId.
          // This ensures the call is made to the correct stock entry and prevents accidental operations.
          description: 'ID of the product being opened.'
        },
        amount: {
          type: 'number',
          description: 'Amount to mark as opened in the product\'s stock unit (e.g., 1 piece, 0.5 kg, 200 ml). Ensure you know the product\'s stock unit before specifying amount.'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['stockId', 'productId', 'amount']
    }
  },
  {
    name: 'lookup_product',
    description: 'Lookup product information with advanced fuzzy matching. Returns all relevant data including exact IDs, available locations, and stock entries.',
    inputSchema: {
      type: 'object',
      properties: {
        productName: {
          type: 'string',
          description: 'Name of the product to lookup.'
        }
      },
      required: ['productName']
    }
  },
  {
    name: 'print_stock_entry_label',
    description: 'Print a label for a specific stock entry.',
    inputSchema: {
      type: 'object',
      properties: {
        stockId: {
          type: 'number',
          description: 'ID of the stock entry to print label for.'
        },
        productId: {
          type: 'number',
          // ProductId is required for verification - if user knows the stockId, they must know the productId.
          // This ensures the call is made to the correct stock entry and prevents accidental operations.
          description: 'ID of the product for the label.'
        }
      },
      required: ['stockId', 'productId']
    }
  }
];