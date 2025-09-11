import { ToolDefinition } from '../types.js';

export const recipeToolDefinitions: ToolDefinition[] = [
  {
    name: 'get_recipes',
    description: 'Get specific fields for all recipes from your Grocy instance. You must specify which fields to retrieve.',
    inputSchema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['id', 'name', 'description', 'base_servings', 'desired_servings', 'not_check_shoppinglist', 'type', 'picture_file_name', 'ingredients', 'instructions']
          },
          description: 'Array of field names to retrieve. For basic lookup use ["id", "name"]. For recipe planning use ["id", "name", "description", "base_servings"]. Available fields: id, name, description, base_servings, desired_servings, not_check_shoppinglist, type, picture_file_name, ingredients, instructions'
        }
      },
      required: ['fields']
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
  },
  {
    name: 'mark_recipe_from_meal_plan_entry_as_cooked',
    description: 'Mark a recipe as cooked by finding its undone meal plan entry, marking it as done, consuming all ingredients and printing labels for any stock entries created.',
    inputSchema: {
      type: 'object',
      properties: {
        recipeId: {
          type: 'number',
          description: 'ID of the recipe to mark as cooked. Use get_recipes tool to find the correct recipe ID by name.'
        },
        servings: {
          type: 'number',
          description: 'Number of servings to consume (default: 1)',
          default: 1
        }
      },
      required: ['recipeId', 'servings']
    }
  }
];