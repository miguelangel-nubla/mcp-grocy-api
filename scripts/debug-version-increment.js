#!/usr/bin/env node

/**
 * This script tests the version increment logic without modifying actual files.
 * It simulates different version scenarios to verify the logic.
 * 
 * Usage:
 *   node debug-version-increment.js [--current=VERSION] [--main=VERSION] [options]
 * 
 * Options:
 *   --current=VERSION   The current version to test (e.g., 1.3.3-dev.1)
 *   --main=VERSION      The main branch version to test (e.g., 1.3.2)
 *   --patch             Test patch increment
 *   --minor             Test minor increment
 *   --major             Test major increment
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  patch: args.includes('--patch'),
  minor: args.includes('--minor'),
  major: args.includes('--major')
};

// Extract current and main versions from args
let currentVersion = '1.3.3-dev.1'; // Default
let mainVersion = '1.3.2';         // Default

for (const arg of args) {
  if (arg.startsWith('--current=')) {
    currentVersion = arg.replace('--current=', '');
  } else if (arg.startsWith('--main=')) {
    mainVersion = arg.replace('--main=', '');
  }
}

console.log(`Testing version increment with:`);
console.log(`- Current version: ${currentVersion}`);
console.log(`- Main version: ${mainVersion}`);
console.log(`- Options: ${JSON.stringify(options)}\n`);

// Version increment logic (copied from prepare-dev-release.js)
function calculateNewVersion(currentVersion, mainVersion, options) {
  // Check if current version is already a dev version
  const isDevVersion = currentVersion.includes('-dev');
  
  // Split the version into parts
  let versionParts;
  let devNumber = 1;
  
  if (isDevVersion) {
    // Extract base version and dev number
    const [baseVersion, devPart] = currentVersion.split('-dev.');
    versionParts = baseVersion.split('.');
    devNumber = parseInt(devPart) + 1; // Increment the dev number
  } else {
    versionParts = currentVersion.split('.');
  }
  
  const [major, minor, patch] = versionParts;
  
  if (options.major) {
    // Major version increment
    return `${parseInt(major) + 1}.0.0-dev.1`;
  } else if (options.minor) {
    // Minor version increment
    return `${major}.${parseInt(minor) + 1}.0-dev.1`;
  } else if (options.patch) {
    // Forced patch version increment
    return `${major}.${minor}.${parseInt(patch) + 1}-dev.1`;
  } else if (isDevVersion) {
    // Just increment the dev number for existing dev version
    const baseVersion = `${major}.${minor}.${patch}`;
    return `${baseVersion}-dev.${devNumber}`;
  } else if (currentVersion === mainVersion) {
    // Convert from main version to dev version
    return `${major}.${minor}.${parseInt(patch) + 1}-dev.1`;
  }
  
  // No change needed
  return currentVersion;
}

// Test the calculation
const newVersion = calculateNewVersion(currentVersion, mainVersion, options);
console.log(`New calculated version: ${newVersion}`);

// Test additional scenarios
console.log('\n=== Testing Additional Scenarios ===');

// Scenario 1: New dev version from main
console.log('\nScenario: Converting main version to dev');
console.log(`Input: 1.3.2 (matching main)`);
console.log(`Output: ${calculateNewVersion('1.3.2', '1.3.2', {})}`);

// Scenario 2: Increment existing dev version
console.log('\nScenario: Incrementing dev number');
console.log(`Input: 1.3.3-dev.1`);
console.log(`Output: ${calculateNewVersion('1.3.3-dev.1', '1.3.2', {})}`);

// Scenario 3: Increment dev version with high dev number
console.log('\nScenario: Incrementing higher dev number');
console.log(`Input: 1.3.3-dev.9`);
console.log(`Output: ${calculateNewVersion('1.3.3-dev.9', '1.3.2', {})}`);

// Scenario 4: Patch increment on existing dev version
console.log('\nScenario: Patch increment on dev version');
console.log(`Input: 1.3.3-dev.5`);
console.log(`Output: ${calculateNewVersion('1.3.3-dev.5', '1.3.2', { patch: true })}`);

// Scenario 5: Minor increment on existing dev version
console.log('\nScenario: Minor increment on dev version');
console.log(`Input: 1.3.3-dev.5`);
console.log(`Output: ${calculateNewVersion('1.3.3-dev.5', '1.3.2', { minor: true })}`);
