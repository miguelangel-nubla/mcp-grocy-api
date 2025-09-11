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

  public markRecipeFromMealPlanEntryAsCooked: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { recipeId, servings } = args || {};
    
    if (!recipeId) {
      throw new McpError(ErrorCode.InvalidParams, 'recipeId is required. Use get_recipes tool to find recipe IDs.');
    }
    
    if (!servings) {
      throw new McpError(ErrorCode.InvalidParams, 'servings is required. Specify the number of servings to consume.');
    }

    try {
      // First, find matching meal plan entry starting from yesterday that is not yet done
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      let mealPlanEntry: any = null;
      let mealPlanMarked = false;

      // Get meal plan entries starting from yesterday
      const mealPlanResponse = await apiClient.get('/objects/meal_plan', {
        queryParams: { 'query[]': `day>=${yesterdayStr}`, limit: '100' }
      });
      
      const mealPlanData = Array.isArray(mealPlanResponse.data) ? mealPlanResponse.data : [];
      
      // Find entry for this recipe that's not done yet (starting from yesterday)
      mealPlanEntry = mealPlanData.find((entry: any) => 
        entry.recipe_id == recipeId && entry.done == 0
      );

      if (!mealPlanEntry) {
        return this.createErrorResult(
          `No undone meal plan entry found for recipe ${recipeId} starting from yesterday (${yesterdayStr}). Recipe must be planned in meal plan before marking as cooked.`,
          { recipeId, searchFrom: yesterdayStr, availableEntries: mealPlanData.filter(e => e.recipe_id == recipeId) }
        );
      }

      // Mark the meal plan entry as done
      await apiClient.put(`/objects/meal_plan/${mealPlanEntry.id}`, {
        body: { ...mealPlanEntry, done: 1 }
      });
      mealPlanMarked = true;

      // Consume the recipe ingredients
      const consumeResult = await this.handleApiCall(`/recipes/${recipeId}/consume`, 'Consume recipe ingredients', {
        method: 'POST',
        body: { servings }
      });

      if (consumeResult.isError) {
        return consumeResult;
      }

      // Try to print label for the created stock entry (best effort)
      let labelPrinted = false;
      
      const recipeResponse = await apiClient.get(`/objects/recipes/${recipeId}`);
      const recipe = recipeResponse.data;
      
      if (recipe && recipe.product_id) {
        const entriesResponse = await apiClient.get(`/stock/products/${recipe.product_id}/entries`);
        const entries = Array.isArray(entriesResponse.data) ? entriesResponse.data : [];
        
        if (entries.length > 0) {
          const recentEntry = entries[0];
          await apiClient.get(`/stock/entry/${recentEntry.stock_id}/printlabel`);
          labelPrinted = true;
        }
      }

      return this.createSuccessResult({
        message: `Recipe ${recipeId} marked as cooked (${servings} servings consumed), meal plan entry marked as done${labelPrinted ? ' and label printed' : ''}`,
        recipeId,
        servings,
        mealPlanEntry: mealPlanEntry ? { id: mealPlanEntry.id, day: mealPlanEntry.day, marked: mealPlanMarked } : null,
        consumptionResult: consumeResult.content
      });

    } catch (error: any) {
      return this.createErrorResult(`Failed to mark recipe as cooked: ${error.message}`, { recipeId, servings });
    }
  };
}

export const recipeHandlers = new RecipeToolHandlers();