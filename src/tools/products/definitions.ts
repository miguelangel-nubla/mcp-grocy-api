import { ToolDefinition } from '../types.js';

export const productToolDefinitions: ToolDefinition[] = [
  {
    name: 'get_products',
    description: 'Get all products from your Grocy instance. Use this to find product IDs and names when working with other tools that require productId parameters.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_product_entries',
    description: 'Get all stock entries for a specific product in your Grocy instance. Use get_products first to find the product ID.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'number',
          description: 'ID of the product to get stock entries for. Use get_products tool to find the correct product ID by name.'
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'get_price_history',
    description: 'Get the price history of a product from your Grocy instance. Use get_products first to find the product ID.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'number',
          description: 'ID of the product to get price history for. Use get_products tool to find the correct product ID by name.'
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'get_product_groups',
    description: 'Get all product groups from your Grocy instance.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];