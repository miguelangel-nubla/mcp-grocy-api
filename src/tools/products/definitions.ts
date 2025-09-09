import { ToolDefinition } from '../types.js';

export const productToolDefinitions: ToolDefinition[] = [
  {
    name: 'get_products',
    description: 'Get specific fields for all products from your Grocy instance. You must specify which fields to retrieve.',
    inputSchema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['id', 'name', 'description', 'product_group_id', 'active', 'location_id', 'shopping_location_id', 'qu_id_purchase', 'qu_id_stock', 'qu_factor_purchase_to_stock', 'min_stock_amount', 'default_best_before_days', 'default_best_before_days_after_open', 'default_best_before_days_after_freezing', 'default_best_before_days_after_thawing', 'picture_file_name', 'allow_label_per_unit', 'energy_per_stock_unit', 'calories_per_stock_unit', 'default_stock_label_type', 'should_not_be_frozen', 'treat_opened_as_out_of_stock', 'no_own_stock', 'cumulate_min_stock_amount_of_sub_products', 'parent_product_id', 'calories_per_unit_factor', 'quick_consume_amount', 'hide_on_stock_overview']
          },
          description: 'Array of field names to retrieve. For basic lookup use ["id", "name"]. For detailed info include ["id", "name", "description", "active"]. Available fields: id, name, description, product_group_id, active, location_id, shopping_location_id, qu_id_purchase, qu_id_stock, qu_factor_purchase_to_stock, min_stock_amount, default_best_before_days, default_best_before_days_after_open, default_best_before_days_after_freezing, default_best_before_days_after_thawing, picture_file_name, allow_label_per_unit, energy_per_stock_unit, calories_per_stock_unit, default_stock_label_type, should_not_be_frozen, treat_opened_as_out_of_stock, no_own_stock, cumulate_min_stock_amount_of_sub_products, parent_product_id, calories_per_unit_factor, quick_consume_amount, hide_on_stock_overview'
        }
      },
      required: ['fields']
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