#!/usr/bin/env node

/**
 * This script verifies the semantic-release configuration files to ensure
 * they are valid and consistent, especially for development branch releases.
 * 
 * It checks for common issues with NPM token authentication and ensures that
 * the dev branch configuration doesn't attempt to publish to NPM.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const readFile = fs.promises.readFile;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function verifyReleaseConfigs() {
  console.log('Verifying semantic-release configurations...');
  
  try {
    // Read the main and dev release configs
    const mainConfigPath = path.join(process.cwd(), '.releaserc.json');
    const devConfigPath = path.join(process.cwd(), '.release-dev.json');
    
    console.log(`Reading config files from:\n- ${mainConfigPath}\n- ${devConfigPath}`);
    
    const mainConfigContent = await readFile(mainConfigPath, 'utf8');
    const devConfigContent = await readFile(devConfigPath, 'utf8');
    
    // Validate JSON syntax first
    try {
      JSON.parse(mainConfigContent);
      console.log('✓ Main config JSON syntax is valid');
    } catch (err) {
      console.error('❌ Main config JSON syntax error:', err.message);
      console.error('Please fix the JSON syntax in .releaserc.json');
      return false;
    }
    
    try {
      JSON.parse(devConfigContent);
      console.log('✓ Dev config JSON syntax is valid');
    } catch (err) {
      console.error('❌ Dev config JSON syntax error:', err.message);
      console.error('Please fix the JSON syntax in .release-dev.json');
      return false;
    }
    
    // Now parse the configs for analysis
    const mainConfig = JSON.parse(mainConfigContent);
    const devConfig = JSON.parse(devConfigContent);
    
    console.log('\n=== Main Release Configuration ===');
    console.log('Branches:', JSON.stringify(mainConfig.branches, null, 2));
    
    // Extract and check NPM publishing configuration
    const mainNpmPlugin = mainConfig.plugins.find(plugin => 
      Array.isArray(plugin) && plugin[0] === '@semantic-release/npm');
    
    if (mainNpmPlugin) {
      console.log('NPM Plugin Config (main):', JSON.stringify(mainNpmPlugin[1], null, 2));
      console.log('✓ Main branch is configured to publish to NPM');
    } else {
      console.log('❓ NPM Plugin not found in main configuration');
      console.log('⚠️ This may be intentional, but verify that main can publish to NPM if needed');
    }
    
    console.log('\n=== Dev Release Configuration ===');
    console.log('Branches:', JSON.stringify(devConfig.branches, null, 2));
    
    // Check if CI mode is disabled (critical for dev branch)
    if (devConfig.ci === false) {
      console.log('✓ Dev branch has "ci": false (good for avoiding token checks)');
    } else {
      console.log('⚠️ Dev branch should set "ci": false to avoid token validation');
    }
    
    // Check top-level npmPublish setting
    if (devConfig.npmPublish === false) {
      console.log('✓ Dev config has top-level "npmPublish": false (good)');
    } else {
      console.log('⚠️ Consider adding top-level "npmPublish": false for extra safety');
    }
    
    if (devConfig.verifyConditions) {
      console.log('Verify Conditions:', JSON.stringify(devConfig.verifyConditions, null, 2));
      
      // Check if verifyConditions excludes npm
      if (!devConfig.verifyConditions.includes('@semantic-release/npm')) {
        console.log('✓ Dev branch correctly excludes npm from verifyConditions');
      } else {
        console.error('❌ Dev branch should NOT include @semantic-release/npm in verifyConditions');
      }
    }
    
    // Extract and check NPM publishing configuration
    const devNpmPlugin = devConfig.plugins.find(plugin => 
      Array.isArray(plugin) && plugin[0] === '@semantic-release/npm');
    
    if (devNpmPlugin) {
      console.log('⚠️ NPM Plugin found in dev branch config:', JSON.stringify(devNpmPlugin[1], null, 2));
      
      // Verify dev branch config isn't trying to publish to NPM
      if (devNpmPlugin[1] && devNpmPlugin[1].npmPublish === false) {
        console.log('✅ Dev branch correctly configured to NOT publish to NPM');
      } else {
        console.error('❌ WARNING: Dev branch may attempt to publish to NPM!');
        console.error('Fix: Set "npmPublish": false in the NPM plugin config');
      }
      
      // Verify token handling is properly configured
      if (devNpmPlugin[1] && devNpmPlugin[1].verifyConditions === false) {
        console.log('✅ Dev branch correctly configured to skip NPM token verification');
      } else {
        console.error('❌ WARNING: Dev branch may try to verify NPM token!');
        console.error('Fix: Set "verifyConditions": false in the NPM plugin config');
      }
    } else {
      console.log('✅ NPM Plugin not found in dev configuration - good!');
      console.log('Dev branch will not attempt npm publishing or token verification');
    }
    
    // Check if we have duplicated config sections
    const duplicatedSections = [];
    if (devConfig.plugins && (devConfig.verifyConditions || devConfig.prepare || devConfig.publish)) {
      duplicatedSections.push('Using both plugins array and step-specific configurations can cause conflicts');
    }
    
    if (duplicatedSections.length > 0) {
      console.warn('\n⚠️ Potential configuration issues:');
      duplicatedSections.forEach(msg => console.warn(`- ${msg}`));
    }
    
    // Add recommendations about CLI arguments
    console.log('\n=== CI Command Recommendations ===');
    console.log('✓ For dev branch, use: npx semantic-release --no-ci --extends ./.release-dev.json');
    console.log('  This ensures that npm tokens are not validated and config is completely replaced');
    
    console.log('\n✅ Configuration verification complete');
    return true;
  } catch (error) {
    console.error('❌ Error verifying release configurations:', error);
    return false;
  }
}

// Run the verification as the main function
(async () => {
  const success = await verifyReleaseConfigs();
  if (!success) {
    process.exit(1);
  }
})();
