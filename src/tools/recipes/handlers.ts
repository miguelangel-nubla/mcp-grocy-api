import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import apiClient from '../../api/client.js';

export class RecipeToolHandlers extends BaseToolHandler {
  public getRecipes: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { fields } = args || {};
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'fields parameter is required and must be a non-empty array of field names');
    }

    try {
      // Fetch recipes
      const recipesResponse = await apiClient.get('/objects/recipes', { queryParams: { 'query[]': 'type=normal' } });
      const recipes = recipesResponse.data;

      if (!Array.isArray(recipes)) {
        return this.createSuccessResult([]);
      }

      // Filter recipes to only include requested fields
      const filteredRecipes = recipes.map((recipe: any) => {
        const filtered: any = {};
        fields.forEach(field => {
          if (recipe.hasOwnProperty(field)) {
            filtered[field] = recipe[field];
          }
        });
        return filtered;
      });

      return this.createSuccessResult(filteredRecipes);
    } catch (error: any) {
      return this.createErrorResult(`Failed to get recipes: ${error.message}`);
    }
  };

  public getRecipeById: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { recipeId } = args || {};
    if (!recipeId) {
      throw new McpError(ErrorCode.InvalidParams, 'recipeId is required');
    }
    
    return this.handleApiCall(`/objects/recipes/${recipeId}`, 'Get recipe by ID');
  };

  public createRecipe: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { 
      name, 
      description = '', 
      servings = 1, 
      baseServingAmount = 1, 
      desiredServings = 1 
    } = args || {};
    
    if (!name) {
      throw new McpError(ErrorCode.InvalidParams, 'Recipe name is required');
    }
    
    const body = {
      name,
      description,
      base_servings: servings,
      desired_servings: desiredServings
    };
    
    return this.handleApiCall('/objects/recipes', 'Create recipe', {
      method: 'POST',
      body
    });
  };

  public getRecipeFulfillment: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { recipeId, servings = 1 } = args || {};
    if (!recipeId) {
      throw new McpError(ErrorCode.InvalidParams, 'recipeId is required');
    }
    
    return this.handleApiCall(`/recipes/${recipeId}/fulfillment`, 'Get recipe fulfillment', {
      queryParams: servings !== 1 ? { servings: servings.toString() } : {}
    });
  };

  public getRecipesFulfillment: ToolHandler = async (args: any): Promise<ToolResult> => {
    return this.handleApiCall('/recipes/fulfillment', 'Get all recipes fulfillment');
  };

  public consumeRecipe: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { recipeId, servings = 1 } = args || {};
    if (!recipeId) {
      throw new McpError(ErrorCode.InvalidParams, 'recipeId is required');
    }
    
    const body = {
      recipe_id: recipeId,
      servings
    };
    
    return this.handleApiCall(`/recipes/${recipeId}/consume`, 'Consume recipe', {
      method: 'POST',
      body
    });
  };

  public addRecipeProductsToShoppingList: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { recipeId } = args || {};
    if (!recipeId) {
      throw new McpError(ErrorCode.InvalidParams, 'recipeId is required');
    }
    
    return this.handleApiCall(`/recipes/${recipeId}/add-not-fulfilled-products-to-shoppinglist`, 'Add recipe products to shopping list', {
      method: 'POST'
    });
  };

  public addMissingProductsToShoppingList: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { recipeId, servings = 1, shoppingListId = 1 } = args || {};
    if (!recipeId) {
      throw new McpError(ErrorCode.InvalidParams, 'recipeId is required');
    }
    
    const body = {
      servings,
      shopping_list_id: shoppingListId
    };
    
    return this.handleApiCall(`recipes/${recipeId}/add-not-fulfilled-products-to-shoppinglist`, 'Add missing products to shopping list', {
      method: 'POST',
      body
    });
  };
}

export const recipeHandlers = new RecipeToolHandlers();