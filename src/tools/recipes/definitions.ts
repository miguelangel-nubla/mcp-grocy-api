import { ToolDefinition } from '../types.js';
import config from '../../config/environment.js';

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
  (() => {
    const { toolSubConfigs } = config.parseToolConfiguration();
    const subConfigs = toolSubConfigs?.get('cooked_something');
    const allowNoMealPlan = subConfigs?.get('allow_no_meal_plan') ?? false;
    const allowAlreadyDone = subConfigs?.get('allow_meal_plan_entry_already_done') ?? false;
    
    return {
      name: 'cooked_something',
      description: 'When the user cooks something this records it as done, consumes recipe ingredients, and creates labeled stock entries with custom portion sizes.',
      inputSchema: {
        type: 'object',
        properties: {
          ...(allowNoMealPlan ? {
            recipeId: {
              type: 'number',
              description: 'ID of the recipe to cook directly.'
            }
          } : {
            mealPlanEntryId: {
              type: 'number', 
              description: `ID of the meal plan entry.${allowAlreadyDone ? '' : ' Note: This will fail if the meal plan entry is already marked as done (done=1).'}`
            }
          }),
          stockAmounts: {
            type: 'array',
            items: {
              type: 'number',
              minimum: 0.1
            },
            description: 'Array of serving amounts for each stock entry to create (e.g., [1, 2, 2] for 1 single serving + 2 double servings). Total will be used for ingredient consumption.'
          }
        },
        required: [
          ...(allowNoMealPlan ? ['recipeId'] : ['mealPlanEntryId']),
          'stockAmounts'
        ]
      }
    };
  })()
];