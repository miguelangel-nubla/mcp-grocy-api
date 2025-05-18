#!/usr/bin/env node

/**
 * This script helps test what version semantic-release would generate
 * for the current branch based on the commit history.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testVersionCalculation() {
  console.log('Testing semantic-release version calculation...');
  
  try {
    // Get the current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    console.log(`Current branch: ${branch}`);
    
    // Get the current version from package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`Current version in package.json: ${packageJson.version}`);
    
    // If on dev branch, show potential version after prepare-dev-release script
    if (branch === 'dev') {
      console.log('\nRunning prepare-dev-release script to see potential version update:');
      try {
        // Run the prepare-dev-release script in a temporary clone
        console.log('Creating temporary clone to test version change...');
        const tmpDir = '/tmp/mcp-grocy-api-version-test';
        execSync(`rm -rf ${tmpDir}`);
        execSync(`git clone . ${tmpDir} -b ${branch}`);
        
        // Test regular update (should increment dev number for dev versions)
        execSync(`cd ${tmpDir} && node scripts/prepare-dev-release.js`, {stdio: 'inherit'});
        const updatedPackageJson = JSON.parse(fs.readFileSync(`${tmpDir}/package.json`, 'utf8'));
        console.log(`\nAfter prepare-dev-release script, version would be: ${updatedPackageJson.version}`);
        
        // Test patch update
        console.log('\nTesting patch version update:');
        execSync(`cd ${tmpDir} && node scripts/prepare-dev-release.js --patch`, {stdio: 'inherit'});
        const patchPackageJson = JSON.parse(fs.readFileSync(`${tmpDir}/package.json`, 'utf8'));
        console.log(`After prepare-dev-release --patch, version would be: ${patchPackageJson.version}`);
        
        // Test minor update
        console.log('\nTesting minor version update:');
        execSync(`cd ${tmpDir} && node scripts/prepare-dev-release.js --minor`, {stdio: 'inherit'});
        const minorPackageJson = JSON.parse(fs.readFileSync(`${tmpDir}/package.json`, 'utf8'));
        console.log(`After prepare-dev-release --minor, version would be: ${minorPackageJson.version}`);
        
        // Cleanup
        execSync(`rm -rf ${tmpDir}`);
      } catch (err) {
        console.error('Error running prepare-dev-release script:', err.message);
      }
    }
    
    // Determine which config file to use
    const configFile = branch === 'dev' ? '.release-dev.json' : '.releaserc.json';
    const configPath = path.resolve(process.cwd(), configFile);
    
    console.log(`\nUsing config file: ${configPath}`);
    
    // Read the config file
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Run semantic-release in dry-run mode using the CLI instead of importing the module
    console.log('\nRunning semantic-release with --dry-run to calculate next version:');
    try {
      const flags = branch === 'dev' ? '--no-ci --no-npm --extends $(pwd)/.release-dev.json' : '';
      execSync(`GITHUB_TOKEN=dummy_token_for_dry_run npx semantic-release --dry-run ${flags}`, {
        stdio: 'inherit',
        env: { ...process.env, CI: 'false' }
      });
    } catch (err) {
      // Semantic-release often exits with error in dry-run mode due to missing tokens
      // This is expected and not a problem for our testing purposes
      console.log('\nSemantic-release exited with error code, but that may be expected in dry-run mode.');
    }
    
    console.log('\nNOTE: If you need to test a proper version calculation:');
    console.log('1. Run npm run prepare-dev-release to update the version in package.json');
    console.log('2. Create a commit with this version update');
    console.log('3. Push to the dev branch and let the GitHub Actions workflow handle it');
  } catch (error) {
    console.error('Error while testing version calculation:', error);
  }
}

// Run the function
testVersionCalculation().catch(console.error);

testVersionCalculation().catch(console.error);
