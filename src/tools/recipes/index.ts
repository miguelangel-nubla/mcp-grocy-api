import { ToolModule } from '../types.js';
import { recipeToolDefinitions } from './definitions.js';
import { recipeHandlers } from './handlers.js';

export const recipeModule: ToolModule = {
  definitions: recipeToolDefinitions,
  handlers: {
    get_recipes: recipeHandlers.getRecipes,
    get_recipe_by_id: recipeHandlers.getRecipeById,
    create_recipe: recipeHandlers.createRecipe,
    get_recipe_fulfillment: recipeHandlers.getRecipeFulfillment,
    get_recipes_fulfillment: recipeHandlers.getRecipesFulfillment,
    consume_recipe: recipeHandlers.consumeRecipe,
    add_recipe_products_to_shopping_list: recipeHandlers.addRecipeProductsToShoppingList,
    add_missing_products_to_shopping_list: recipeHandlers.addMissingProductsToShoppingList,
    cooked_something: recipeHandlers.markRecipeFromMealPlanEntryAsCooked
  }
};

export * from './definitions.js';
export * from './handlers.js';