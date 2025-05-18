# Summary of Changes

## Problem Identified

1. The semantic-release configuration for the dev branch was attempting to verify NPM credentials even though publishing was disabled.
2. When running on the dev branch, semantic-release was generating version numbers that didn't properly follow the main branch versioning.

## Solutions Implemented

### 1. NPM Token Validation Fix

We completely removed references to `@semantic-release/npm` from the dev branch configuration:

- Removed the plugin from all lifecycle steps in `.release-dev.json`
- Set `"ci": false` and `"npmPublish": false` at the top level
- Added `--no-npm` flag to the semantic-release command for the dev branch

### 2. Version Calculation Improvements

We implemented a custom solution to ensure proper version calculation:

- Created a `prepare-dev-release.js` script that:
  - Checks the main branch version
  - Updates the dev branch version to be `${main-version-with-increment}-dev.1`
  - Updates both package.json and config.yaml

- Added it to the GitHub Actions workflow to run before semantic-release:
  ```yaml
  # Run the prepare-dev-release script
  npm run prepare-dev-release
  
  # Commit changes if version was updated
  if git diff --name-only | grep -q "package.json\|config.yaml"; then
    git add package.json config.yaml
    git commit -m "chore(release): update version for dev branch [skip ci]"
  fi
  ```

- Added configuration in `.release-dev.json` to:
  - Use `"delay": "verifyConditions"` to respect our version
  - Set expanded `releaseRules` to recognize more commit types

### 3. Additional Tooling and Documentation

- Enhanced verification script to check for common configuration errors
- Added documentation for how versioning works in the dev branch
- Created additional npm scripts for easier version management:
  ```
  npm run prepare-dev-release:patch
  npm run prepare-dev-release:minor
  npm run prepare-dev-release:major
  npm run prepare-dev-release:dryrun
  ```

## Benefits

1. **No More NPM Token Validation**: The dev branch no longer attempts to validate NPM tokens.
2. **Proper Dev Versioning**: Version numbers now properly increment from the main branch.
3. **Developer Control**: Developers can manually control version increments when needed.
4. **Improved Documentation**: Clear documentation on how the release process works.
5. **Enhanced CI/CD Pipeline**: Fixed Git fetching to handle both shallow and complete repositories.

## Example

Before: 
- The dev branch would mistakenly start at version `1.0.0-dev.1` regardless of main branch version
- Existing dev versions would always increment the patch number instead of the dev number (e.g., `1.3.3-dev.1` -> `1.3.4-dev.1` instead of `1.3.3-dev.2`)

After:
- If main branch is at `1.3.2`, the dev branch automatically increments to `1.3.3-dev.1`
- Existing dev versions correctly increment the dev number (e.g., `1.3.3-dev.1` -> `1.3.3-dev.2`)
- With manual control, you can jump to `1.4.0-dev.1` if needed
