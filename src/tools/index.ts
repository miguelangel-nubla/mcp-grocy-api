import { ToolDefinition, ToolHandler, ToolModule } from './types.js';
import { stockModule } from './stock/index.js';
import { productModule } from './products/index.js';
import { recipeModule } from './recipes/index.js';
import { shoppingModule } from './shopping/index.js';
import { systemModule } from './system/index.js';

// Import additional tool modules for completeness
import { BaseToolHandler } from './base.js';
import { ToolResult, ToolHandler as THandler } from './types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import apiClient from '../api/client.js';

// Meal Plan Tools
const mealPlanToolDefinitions = [
  {
    name: 'get_meal_plan',
    description: 'Get your meal plan data from Grocy instance with corresponding recipe details. Returns planned meals for a specific date including recipe names, descriptions, meal sections, and other details. Use this to find out what recipes/meals are planned for a specific date (e.g., "what\'s for dinner tomorrow", "recipes for today", "meal plan for next week"). The returned data includes the id field (meal plan entry ID) which can be used with delete_recipe_from_meal_plan.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (e.g., "2024-12-25"). Use today\'s date or future dates to see planned meals.'
        }
      },
      required: ['date']
    }
  },
  {
    name: 'get_meal_plan_sections',
    description: 'Get all available meal plan sections from your Grocy instance (e.g., Breakfast, Lunch, Dinner, Snacks). Use this to find valid section IDs for add_recipe_to_meal_plan.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: []
    }
  },
  {
    name: 'add_recipe_to_meal_plan',
    description: 'Add a recipe to the meal plan for a specific date and meal section. Use get_recipes to find recipe IDs and get_meal_plan_sections to find valid section IDs and their names.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        recipeId: {
          type: 'number',
          description: 'ID of the recipe to add to the meal plan. Use get_recipes tool to find valid recipe IDs and their names.'
        },
        day: {
          type: 'string',
          description: 'Day to add the recipe to in YYYY-MM-DD format (e.g., "2024-12-25").'
        },
        servings: {
          type: 'number',
          description: 'Number of servings for this meal plan entry (e.g., 2 for a family of two, 4 for a family of four).'
        },
        sectionId: {
          type: 'number',
          description: 'ID of the meal plan section that defines when this meal will be consumed (e.g., breakfast, lunch, dinner, snacks). Use get_meal_plan_sections tool to discover what sections are available in your Grocy instance and get their specific IDs and names.'
        }
      },
      required: ['recipeId', 'day', 'servings', 'sectionId']
    }
  },
  {
    name: 'delete_recipe_from_meal_plan',
    description: 'Delete a specific recipe entry from the meal plan. Use get_meal_plan to find the mealPlanEntryId of the entry you want to remove.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Date of the meal plan entry in YYYY-MM-DD format (e.g., "2024-12-25").'
        },
        mealPlanEntryId: {
          type: 'number',
          description: 'ID of the specific meal plan entry to delete. Use get_meal_plan to find the correct entry ID.'
        }
      },
      required: ['date', 'mealPlanEntryId']
    }
  }
];

class MealPlanToolHandlers extends BaseToolHandler {
  public getMealPlan: THandler = async (args: any): Promise<ToolResult> => {
    const date = args?.date || new Date().toISOString().split('T')[0];
    
    try {
      // First get the meal plan entries for the date
      const mealPlanResponse = await apiClient.get('/objects/meal_plan', {
        queryParams: { 'query[]': `day=${date}`, limit: '100' }
      });
      
      const mealPlanData = mealPlanResponse.data;
      
      if (!mealPlanData || !Array.isArray(mealPlanData)) {
        return this.createSuccessResult({ message: 'No meal plan entries found for this date', date });
      }

      if (mealPlanData.length === 0) {
        return this.createSuccessResult({ 
          message: 'No meals planned for this date',
          date: date,
          meal_plan_entries: []
        });
      }

      // Extract unique recipe IDs from meal plan entries
      const recipeIds = [...new Set(mealPlanData.map((entry: any) => entry.recipe_id).filter(id => id))];

      // Fetch recipe details and sections in parallel
      const [recipeResponses, sectionsResponse] = await Promise.allSettled([
        Promise.allSettled(recipeIds.map(async (recipeId: any) => {
          try {
            const recipe = await apiClient.get(`/objects/recipes/${recipeId}`);
            return { id: recipeId, ...recipe.data };
          } catch (error: any) {
            return { id: recipeId, name: `Recipe ${recipeId} (details unavailable)`, error: error.message };
          }
        })),
        apiClient.get('/objects/meal_plan_sections')
      ]);

      const recipes = recipeResponses.status === 'fulfilled' ? 
        recipeResponses.value.filter(r => r.status === 'fulfilled').map(r => r.value) : [];
      const sections = sectionsResponse.status === 'fulfilled' ? 
        (Array.isArray(sectionsResponse.value.data) ? sectionsResponse.value.data : []) : [];

      const recipesMap = recipes.reduce((acc: any, recipe: any) => {
        acc[recipe.id] = recipe;
        return acc;
      }, {});

      const sectionsMap = sections.reduce((acc: any, section: any) => {
        acc[section.id] = section;
        return acc;
      }, {});

      // Enhance meal plan entries with recipe and section details
      const enhancedMealPlan = mealPlanData.map((entry: any) => ({
        ...entry,
        recipe_details: recipesMap[entry.recipe_id] || { name: `Recipe ${entry.recipe_id} (not found)` },
        section_details: sectionsMap[entry.section_id] || { name: `Section ${entry.section_id}` }
      }));

      return this.createSuccessResult({
        date: date,
        meal_plan_entries: enhancedMealPlan,
        all_available_meal_sections: sections.map((section: any) => ({
          id: section.id,
          name: section.name,
          sort_number: section.sort_number
        }))
      });
    } catch (error: any) {
      return this.createErrorResult(`Failed to get meal plan: ${error.message}`, { date });
    }
  };

  public getMealPlanSections: THandler = async (_args: any): Promise<ToolResult> => {
    return this.handleApiCall('/objects/meal_plan_sections', 'Get all meal plan sections');
  };

  public addRecipeToMealPlan: THandler = async (args: any): Promise<ToolResult> => {
    const { recipeId, day, servings, sectionId } = args || {};
    
    if (!recipeId) {
      throw new McpError(ErrorCode.InvalidParams, 'recipeId is required. Use get_recipes tool to find valid recipe IDs.');
    }
    if (!day) {
      throw new McpError(ErrorCode.InvalidParams, 'day is required. Specify the date in YYYY-MM-DD format (e.g., "2024-12-25").');
    }
    if (!servings) {
      throw new McpError(ErrorCode.InvalidParams, 'servings is required. Specify how many servings to plan for this meal (e.g., 2, 4).');
    }
    if (!sectionId) {
      throw new McpError(ErrorCode.InvalidParams, 'sectionId is required. Use get_meal_plan_sections tool to find valid section IDs and their names.');
    }
    
    const body = {
      day,
      recipe_id: recipeId,
      recipe_servings: servings,
      section_id: sectionId,
      type: "recipe"
    };
    
    return this.handleApiCall('/objects/meal_plan', 'Add recipe to meal plan', {
      method: 'POST',
      body
    });
  };

  public deleteRecipeFromMealPlan: THandler = async (args: any): Promise<ToolResult> => {
    const { date, mealPlanEntryId } = args || {};
    
    if (!date) {
      throw new McpError(ErrorCode.InvalidParams, 'date is required. Specify the date in YYYY-MM-DD format (e.g., "2024-12-25").');
    }
    if (!mealPlanEntryId) {
      throw new McpError(ErrorCode.InvalidParams, 'mealPlanEntryId is required. Use get_meal_plan to find the correct entry ID.');
    }
    
    return this.handleApiCall(`/objects/meal_plan/${mealPlanEntryId}`, 'Delete recipe from meal plan', {
      method: 'DELETE'
    });
  };
}

// Action Tools (chores, tasks, batteries, undo)
const actionToolDefinitions = [
  {
    name: 'track_chore_execution',
    description: 'Track execution of a chore in your Grocy instance. Use get_chores to find chore IDs and get_users to find user IDs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        choreId: {
          type: 'number',
          description: 'ID of the chore that was executed. Use get_chores tool to find the correct chore ID by name.'
        },
        executedBy: {
          type: 'number',
          description: 'ID of the user who executed the chore (optional). Use get_users tool to find available user IDs and names.'
        },
        trackedTime: {
          type: 'string',
          description: 'When the chore was executed in YYYY-MM-DD HH:MM:SS format (default: now)'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['choreId']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed in your Grocy instance. Use get_tasks first to find the task ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'number',
          description: 'ID of the task to complete. Use get_tasks tool to find the correct task ID by name or description.'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'charge_battery',
    description: 'Track charging of a battery in your Grocy instance. Use get_batteries first to find the battery ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        batteryId: {
          type: 'number',
          description: 'ID of the battery that was charged. Use get_batteries tool to find the correct battery ID by name.'
        },
        trackedTime: {
          type: 'string',
          description: 'When the battery was charged in YYYY-MM-DD HH:MM:SS format (default: now)'
        },
        note: {
          type: 'string',
          description: 'Optional note'
        }
      },
      required: ['batteryId']
    }
  },
  {
    name: 'undo_action',
    description: 'Undo an action for different entity types (chores, batteries, tasks).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        entityType: {
          type: 'string',
          description: 'Type of entity (chores, batteries, tasks)',
          enum: ['chores', 'batteries', 'tasks']
        },
        id: {
          type: 'string',
          description: 'ID of the execution, charge cycle, or task'
        }
      },
      required: ['entityType', 'id']
    }
  }
];

class ActionToolHandlers extends BaseToolHandler {
  public trackChoreExecution: THandler = async (args: any): Promise<ToolResult> => {
    const { choreId, executedBy, trackedTime, note } = args || {};
    if (!choreId) {
      throw new McpError(ErrorCode.InvalidParams, 'choreId is required');
    }
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const body = {
      tracked_time: trackedTime || timestamp,
      ...(executedBy ? { done_by: executedBy } : {}),
      ...(note ? { note } : {})
    };
    
    return this.handleApiCall(`chores/${choreId}/execute`, 'Track chore execution', {
      method: 'POST',
      body
    });
  };

  public completeTask: THandler = async (args: any): Promise<ToolResult> => {
    const { taskId, note } = args || {};
    if (!taskId) {
      throw new McpError(ErrorCode.InvalidParams, 'taskId is required');
    }
    
    return this.handleApiCall(`tasks/${taskId}/complete`, 'Complete task', {
      method: 'POST',
      body: note ? { note } : {}
    });
  };

  public chargeBattery: THandler = async (args: any): Promise<ToolResult> => {
    const { batteryId, trackedTime, note } = args || {};
    if (!batteryId) {
      throw new McpError(ErrorCode.InvalidParams, 'batteryId is required');
    }
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const body = {
      tracked_time: trackedTime || timestamp,
      ...(note ? { note } : {})
    };
    
    return this.handleApiCall(`batteries/${batteryId}/charge`, 'Charge battery', {
      method: 'POST',
      body
    });
  };

  public undoAction: THandler = async (args: any): Promise<ToolResult> => {
    const { entityType, id } = args;
    
    let endpoint;
    switch (entityType.toLowerCase()) {
      case 'chore':
      case 'chores':
        endpoint = `/chores/executions/${id}/undo`;
        break;
      case 'battery':
      case 'batteries':
        endpoint = `/batteries/charge-cycles/${id}/undo`;
        break;
      case 'task':
      case 'tasks':
        endpoint = `/tasks/${id}/undo`;
        break;
      default:
        return this.createErrorResult(`Unsupported entity type: ${entityType}`);
    }
    
    return this.handleApiCall(endpoint, `Undo ${entityType} action`, {
      method: 'POST'
    });
  };
}

// Create handler instances
const mealPlanHandlers = new MealPlanToolHandlers();
const actionHandlers = new ActionToolHandlers();

// Additional modules
const mealPlanModule: ToolModule = {
  definitions: mealPlanToolDefinitions,
  handlers: {
    get_meal_plan: mealPlanHandlers.getMealPlan,
    get_meal_plan_sections: mealPlanHandlers.getMealPlanSections,
    add_recipe_to_meal_plan: mealPlanHandlers.addRecipeToMealPlan,
    delete_recipe_from_meal_plan: mealPlanHandlers.deleteRecipeFromMealPlan
  }
};

const actionModule: ToolModule = {
  definitions: actionToolDefinitions,
  handlers: {
    track_chore_execution: actionHandlers.trackChoreExecution,
    complete_task: actionHandlers.completeTask,
    charge_battery: actionHandlers.chargeBattery,
    undo_action: actionHandlers.undoAction
  }
};

// Registry of all tool modules
const toolModules: ToolModule[] = [
  stockModule,
  productModule,
  recipeModule,
  shoppingModule,
  systemModule,
  mealPlanModule,
  actionModule
];

// Tool Registry class
export class ToolRegistry {
  private definitions: ToolDefinition[] = [];
  private handlers: Record<string, ToolHandler> = {};
  
  constructor() {
    this.registerModules();
  }
  
  private registerModules(): void {
    for (const module of toolModules) {
      // Add definitions
      this.definitions.push(...module.definitions);
      
      // Add handlers
      Object.assign(this.handlers, module.handlers);
    }
    
    console.error(`[TOOLS] Registered ${this.definitions.length} tools`);
  }
  
  public getDefinitions(): ToolDefinition[] {
    return this.definitions;
  }
  
  public getHandler(name: string): ToolHandler | undefined {
    return this.handlers[name];
  }
  
  public hasHandler(name: string): boolean {
    return name in this.handlers;
  }
  
  public getToolNames(): string[] {
    return this.definitions.map(def => def.name);
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
export default toolRegistry;

// Export types and modules for testing
export * from './types.js';
export * from './base.js';
export { stockModule, productModule, recipeModule, shoppingModule, systemModule, mealPlanModule, actionModule };