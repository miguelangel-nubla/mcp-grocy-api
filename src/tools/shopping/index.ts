import { ToolModule } from '../types.js';
import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export const shoppingToolDefinitions = [
  {
    name: 'get_shopping_list',
    description: 'Get your current shopping list items.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'add_shopping_list_item',
    description: 'Add an item to your shopping list. Use get_products first to find the product ID you want to add.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        productId: {
          type: 'number',
          description: 'ID of the product to add. Use get_products tool to find the correct product ID by searching for the product name in the results.'
        },
        amount: {
          type: 'number',
          description: 'Amount to add (default: 1)',
          default: 1
        },
        shoppingListId: {
          type: 'number',
          description: 'ID of the shopping list to add to (default: 1). Most users have only one shopping list with ID 1.',
          default: 1
        },
        note: {
          type: 'string',
          description: 'Optional note for the shopping list item'
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'remove_shopping_list_item',
    description: 'Remove an item from your shopping list. Use get_shopping_list first to find the shopping list item ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        shoppingListItemId: {
          type: 'number',
          description: 'ID of the shopping list item to remove. Use get_shopping_list tool to find the correct shopping list item ID by looking at the "id" field in the results.'
        }
      },
      required: ['shoppingListItemId']
    }
  },
  {
    name: 'get_shopping_locations',
    description: 'Get all shopping locations (stores) from your Grocy instance. Use this to find store IDs and names when working with tools that require storeId parameters.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  }
];

class ShoppingToolHandlers extends BaseToolHandler {
  public getShoppingList: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/shopping_list', 'Get shopping list items');
  };

  public addShoppingListItem: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { productId, amount = 1, shoppingListId = 1, note = '' } = args || {};
    if (!productId) {
      throw new McpError(ErrorCode.InvalidParams, 'productId is required');
    }
    
    const body = {
      product_id: productId,
      amount,
      shopping_list_id: shoppingListId,
      note
    };
    
    return this.handleApiCall('/objects/shopping_list', 'Add shopping list item', {
      method: 'POST',
      body
    });
  };

  public removeShoppingListItem: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { shoppingListItemId } = args || {};
    if (!shoppingListItemId) {
      throw new McpError(ErrorCode.InvalidParams, 'shoppingListItemId is required');
    }
    
    return this.handleApiCall(`/objects/shopping_list/${shoppingListItemId}`, 'Remove shopping list item', {
      method: 'DELETE'
    });
  };

  public getShoppingLocations: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/shopping_locations', 'Get all shopping locations');
  };
}

const shoppingHandlers = new ShoppingToolHandlers();

export const shoppingModule: ToolModule = {
  definitions: shoppingToolDefinitions,
  handlers: {
    get_shopping_list: shoppingHandlers.getShoppingList,
    add_shopping_list_item: shoppingHandlers.addShoppingListItem,
    remove_shopping_list_item: shoppingHandlers.removeShoppingListItem,
    get_shopping_locations: shoppingHandlers.getShoppingLocations
  }
};