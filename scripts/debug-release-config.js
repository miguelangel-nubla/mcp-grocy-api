#!/usr/bin/env node

/**
 * This script helps debug semantic-release configuration issues in CI environments
 * by printing detailed information about the environment and configuration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

async function debugReleaseConfig() {
  printHeader("SEMANTIC-RELEASE DEBUG INFO");
  
  // Print Node and NPM versions
  console.log(`Node Version: ${process.version}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Platform: ${process.platform}`);
  
  // Print current directory and working directory
  console.log(`Current Directory: ${process.cwd()}`);
  console.log(`Script Directory: ${__dirname}`);
  
  // Print environment variables (sanitized)
  printHeader("ENVIRONMENT VARIABLES (SANITIZED)");
  const env = process.env;
  const sensitiveKeys = ['TOKEN', 'SECRET', 'KEY', 'PASSWORD', 'PASS', 'AUTH'];
  
  Object.keys(env).sort().forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive))) {
      console.log(`${key}: [REDACTED]`);
    } else {
      console.log(`${key}: ${env[key]}`);
    }
  });
  
  // Load and print configuration files
  printHeader("RELEASE CONFIGURATION FILES");
  
  try {
    const mainConfigPath = path.join(process.cwd(), '.releaserc.json');
    const devConfigPath = path.join(process.cwd(), '.release-dev.json');
    
    if (fs.existsSync(mainConfigPath)) {
      const mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf8'));
      console.log("Main Release Config (.releaserc.json):");
      console.log(JSON.stringify(mainConfig, null, 2));
    } else {
      console.log("Main Release Config (.releaserc.json) file not found!");
    }
    
    if (fs.existsSync(devConfigPath)) {
      const devConfig = JSON.parse(fs.readFileSync(devConfigPath, 'utf8'));
      console.log("\nDev Release Config (.release-dev.json):");
      console.log(JSON.stringify(devConfig, null, 2));
    } else {
      console.log("Dev Release Config (.release-dev.json) file not found!");
    }
  } catch (error) {
    console.error("Error reading config files:", error.message);
  }
  
  // Print installed packages related to semantic-release
  printHeader("SEMANTIC-RELEASE PACKAGES");
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      console.log("Dependencies:");
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      const semanticReleasePackages = Object.keys(dependencies).filter(pkg => 
        pkg === 'semantic-release' || pkg.startsWith('@semantic-release/')
      );
      
      semanticReleasePackages.forEach(pkg => {
        console.log(`${pkg}: ${dependencies[pkg]}`);
      });
    } else {
      console.log("package.json file not found!");
    }
  } catch (error) {
    console.error("Error reading package.json:", error.message);
  }
  
  // Print recommendations
  printHeader("RECOMMENDATIONS");
  
  console.log("For dev branch, use these flags with semantic-release:");
  console.log("--no-ci --no-npm --extends $(pwd)/.release-dev.json");
  console.log("\nMake sure the dev config has these settings:");
  console.log("- \"ci\": false");
  console.log("- \"npmPublish\": false");
  console.log("- No @semantic-release/npm in any step");
  
  printHeader("END OF DEBUG INFO");
}

// Run the debug function
debugReleaseConfig().catch(error => {
  console.error("Error running debug script:", error);
  process.exit(1);
});
