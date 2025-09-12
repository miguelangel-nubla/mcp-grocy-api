import { BaseToolHandler } from '../base.js';
import { ToolResult, ToolHandler } from '../types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import apiClient from '../../api/client.js';
import { StockToolHandlers } from '../stock/handlers.js';

export class RecipeToolHandlers extends BaseToolHandler {
  private stockHandlers = new StockToolHandlers();
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

  public getRecipesFulfillment: ToolHandler = async (): Promise<ToolResult> => {
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
    
    return this.handleApiCall(`/recipes/${recipeId}/add-not-fulfilled-products-to-shoppinglist`, 'Add missing products to shopping list', {
      method: 'POST',
      body
    });
  };

  public markRecipeFromMealPlanEntryAsCooked: ToolHandler = async (args: any): Promise<ToolResult> => {
    const { mealPlanEntryId, stockAmounts } = args || {};
    
    if (!mealPlanEntryId) {
      throw new McpError(ErrorCode.InvalidParams, 'mealPlanEntryId is required.');
    }

    if (!stockAmounts || !Array.isArray(stockAmounts) || stockAmounts.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'stockAmounts is required and must be a non-empty array of serving amounts.');
    }

    // Validate all stock amounts are positive numbers
    for (let i = 0; i < stockAmounts.length; i++) {
      const amount = stockAmounts[i];
      if (typeof amount !== 'number' || amount <= 0) {
        throw new McpError(ErrorCode.InvalidParams, `stockAmounts[${i}] must be a positive number, got: ${amount}`);
      }
    }

    const completedSteps: string[] = [];
    
    try {
      // Get the specific meal plan entry
      const mealPlanResponse = await apiClient.get(`/objects/meal_plan/${mealPlanEntryId}`);
      const mealPlanEntry = mealPlanResponse.data;

      if (!mealPlanEntry) {
        throw new Error(`Meal plan entry ${mealPlanEntryId} not found.`);
      }

      if (mealPlanEntry.done == 1) {
        throw new Error(`Meal plan entry ${mealPlanEntryId} is already marked as done. Cannot mark as cooked again.`);
      }

      const recipeId = mealPlanEntry.recipe_id;

      // Calculate total servings
      const totalServings = stockAmounts.reduce((sum: number, amount: number) => sum + amount, 0);
      
      // Create recipe name with YYYY-MM-DD#<meal_plan.id> pattern  
      const mealPlanDate = mealPlanEntry.day || new Date().toISOString().split('T')[0];
      const mealplanShadow = `${mealPlanDate}#${mealPlanEntryId}`;
      
      // Mark the meal plan entry as done and update recipe_servings
      await apiClient.put(`/objects/meal_plan/${mealPlanEntryId}`, {
        done: 1,
        recipe_servings: totalServings
      });
      completedSteps.push('Meal plan entry marked as done');

      // Query for the mealplan shadow recipe by name
      const shadowRecipeResponse = await apiClient.get('/objects/recipes', {
        queryParams: { 'query[]': `name=${mealplanShadow}` }
      });
      
      if (shadowRecipeResponse.data.length === 0) {
        throw new Error(`Mealplan shadow recipe '${mealplanShadow}' not found. Cannot consume ingredients.`);
      }
      
      const shadowRecipeId = shadowRecipeResponse.data[0].id;
      
      // Consume ingredients using the shadow recipe ID
      await apiClient.post(`/recipes/${shadowRecipeId}/consume`);
      completedSteps.push('Recipe ingredients consumed');

      // Split stock entry and print labels for each portion
      let stockEntries: { splitEntries: Array<{stockId: any, amount: number, type: string, unit: string}>, labelsPrinted: number } = { splitEntries: [], labelsPrinted: 0 };
      
      const recipeResponse = await apiClient.get(`/objects/recipes/${recipeId}`);
      const recipe = recipeResponse.data;
      
      if (recipe && recipe.product_id) {
        // Get product details, quantity unit, and the most recent stock entry created by recipe consumption
        const [productResponse, entriesResponse] = await Promise.all([
          apiClient.get(`/objects/products/${recipe.product_id}`),
          apiClient.get(`/stock/products/${recipe.product_id}/entries`, {
            queryParams: { order: 'row_created_timestamp:desc', limit: '1' }
          })
        ]);
        const product = productResponse.data;
        
        // Get quantity unit info
        let quantityUnit = null;
        if (product.qu_id_stock) {
          try {
            const quantityUnitResponse = await apiClient.get(`/objects/quantity_units/${product.qu_id_stock}`);
            quantityUnit = quantityUnitResponse.data;
          } catch (error) {
            console.warn('Failed to fetch quantity unit:', error);
          }
        }
        
        // Helper function to get correct unit form
        const getUnitForm = (amount: number): string => {
          if (!quantityUnit) return '';
          
          // Handle edge cases
          if (!quantityUnit.name) return '';
          if (amount === 1) return quantityUnit.name;
          
          // Use plural form if available, otherwise fallback to singular
          return quantityUnit.name_plural || quantityUnit.name;
        };
        
        if (entriesResponse.data.length > 0) {
          const originalEntry = entriesResponse.data[0];
          
          // Use the generic stock splitting helper method
          stockEntries.splitEntries = await this.stockHandlers.splitStockEntry(
            originalEntry, 
            stockAmounts, 
            getUnitForm
          );
          
          // Print labels for all entries
          for (const entry of stockEntries.splitEntries) {
            try {
              await apiClient.get(`/stock/entry/${entry.stockId}/printlabel`);
              stockEntries.labelsPrinted++;
            } catch (error) {
              console.error(`Failed to print label for stock entry ${entry.stockId}:`, error);
            }
          }
        }
      }

      return this.createSuccessResult({
        message: `Meal plan entry ${mealPlanEntryId} marked as cooked (recipe ${recipeId}, ${totalServings} servings consumed, ${stockEntries.splitEntries.length} stock entries created, ${stockEntries.labelsPrinted} labels printed)`,
        stockEntries,
      });

    } catch (error: any) {
      return this.createErrorResult(`Failed to mark meal plan entry as cooked.`, { 
        completedSteps,
        reason: error.message,
        help: completedSteps.length > 0 
          ? `Completed steps: ${completedSteps.join(', ')}. Check the error above and retry if needed.`
          : 'No steps completed. Verify the meal plan entry ID exists and is not already marked as done.'
      });
    }
  };
}

export const recipeHandlers = new RecipeToolHandlers();