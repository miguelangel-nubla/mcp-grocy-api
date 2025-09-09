import { ToolDefinition } from '../types.js';

export const recipeToolDefinitions: ToolDefinition[] = [
  {
    name: 'get_recipes',
    description: 'Get all recipes from your Grocy instance along with all available meal plan sections. Use this when you need to see all available recipes for meal planning or recipe management.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_recipe_by_id',
    description: 'Get a specific recipe by its ID from your Grocy instance.',
    inputSchema: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'number',
          description: 'ID of the recipe to retrieve'
        }
      },
      required: ['recipeId']
    }
  },
  {
    name: 'create_recipe',
    description: 'Create a new recipe in your Grocy instance.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the recipe'
        },
        description: {
          type: 'string',
          description: 'Description of the recipe'
        },
        servings: {
          type: 'number',
          description: 'Number of servings (default: 1)',
          default: 1
        },
        baseServingAmount: {
          type: 'number',
          description: 'Base serving amount (default: 1)',
          default: 1
        },
        desiredServings: {
          type: 'number',
          description: 'Number of desired servings (default: 1)',
          default: 1
        }
      },
      required: ['name']
    }
  },
  {
    name: 'get_recipe_fulfillment',
    description: 'Get stock fulfillment information for a recipe. Use get_recipes first to find the recipe ID.',
    inputSchema: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'number',
          description: 'ID of the recipe to check fulfillment for. Use get_recipes tool to find the correct recipe ID by name.'
        },
        servings: {
          type: 'number',
          description: 'Number of servings (default: 1)',
          default: 1
        }
      },
      required: ['recipeId']
    }
  },
  {
    name: 'get_recipes_fulfillment',
    description: 'Get fulfillment information for all recipes.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'consume_recipe',
    description: 'Consume all ingredients needed for a recipe in your Grocy instance. Use get_recipes first to find the recipe ID.',
    inputSchema: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'number',
          description: 'ID of the recipe to consume. Use get_recipes tool to find the correct recipe ID by name.'
        },
        servings: {
          type: 'number',
          description: 'Number of servings to consume (default: 1)',
          default: 1
        }
      },
      required: ['recipeId']
    }
  },
  {
    name: 'add_recipe_products_to_shopping_list',
    description: 'Add not fulfilled products of a recipe to the shopping list.',
    inputSchema: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          description: 'ID of the recipe'
        }
      },
      required: ['recipeId']
    }
  },
  {
    name: 'add_missing_products_to_shopping_list',
    description: 'Add all missing products for a recipe to your shopping list. Use get_recipes first to find the recipe ID.',
    inputSchema: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'number',
          description: 'ID of the recipe to add missing products for. Use get_recipes tool to find the correct recipe ID by name.'
        },
        servings: {
          type: 'number',
          description: 'Number of servings (default: 1)',
          default: 1
        },
        shoppingListId: {
          type: 'number',
          description: 'ID of the shopping list to add to (default: 1). Most users have only one shopping list with ID 1.',
          default: 1
        }
      },
      required: ['recipeId']
    }
  }
];