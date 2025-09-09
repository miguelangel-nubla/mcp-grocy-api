import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/tools/index.js';

describe('ToolRegistry', () => {
  it('should register all tool definitions', () => {
    const registry = new ToolRegistry();
    const definitions = registry.getDefinitions();
    
    expect(definitions).toBeDefined();
    expect(definitions.length).toBeGreaterThan(30); // We should have 30+ tools
    
    // Check for some key tools
    const toolNames = definitions.map(def => def.name);
    expect(toolNames).toContain('get_products');
    expect(toolNames).toContain('get_stock');
    expect(toolNames).toContain('get_recipes');
    expect(toolNames).toContain('purchase_product');
    expect(toolNames).toContain('consume_product');
  });

  it('should have handlers for all defined tools', () => {
    const registry = new ToolRegistry();
    const definitions = registry.getDefinitions();
    
    for (const definition of definitions) {
      expect(registry.hasHandler(definition.name)).toBe(true);
      expect(registry.getHandler(definition.name)).toBeDefined();
    }
  });

  it('should return undefined for non-existent handlers', () => {
    const registry = new ToolRegistry();
    
    expect(registry.hasHandler('non_existent_tool')).toBe(false);
    expect(registry.getHandler('non_existent_tool')).toBeUndefined();
  });

  it('should return correct tool names', () => {
    const registry = new ToolRegistry();
    const toolNames = registry.getToolNames();
    const definitions = registry.getDefinitions();
    
    expect(toolNames.length).toBe(definitions.length);
    expect(toolNames).toEqual(definitions.map(def => def.name));
  });
});

describe('Tool Definitions Structure', () => {
  const registry = new ToolRegistry();
  const definitions = registry.getDefinitions();

  it('should have valid structure for all tool definitions', () => {
    for (const definition of definitions) {
      expect(definition).toHaveProperty('name');
      expect(definition).toHaveProperty('description');
      expect(definition).toHaveProperty('inputSchema');
      
      expect(typeof definition.name).toBe('string');
      expect(typeof definition.description).toBe('string');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema).toHaveProperty('properties');
      expect(definition.inputSchema).toHaveProperty('required');
      expect(Array.isArray(definition.inputSchema.required)).toBe(true);
    }
  });

  it('should have unique tool names', () => {
    const toolNames = definitions.map(def => def.name);
    const uniqueNames = [...new Set(toolNames)];
    
    expect(toolNames.length).toBe(uniqueNames.length);
  });
});