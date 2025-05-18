# Release Configuration Guide

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) to automate the versioning and publishing process. The configuration is designed to:

1. Publish releases to npm from the `main` branch
2. Create pre-releases on GitHub (without npm publishing) from the `dev` branch

## Configuration Files

- `.releaserc.json` - Main branch configuration
- `.release-dev.json` - Development branch configuration

## Branch Strategy

- **main**: Full releases published to npm and GitHub
- **dev**: Pre-releases published only to GitHub with `-dev.X` version suffix

## Dev Branch Critical Settings

The dev branch configuration contains these critical settings to prevent NPM token validation:

```json
{
  "ci": false,           // Disable CI environment checks
  "npmPublish": false,   // Disable NPM publishing at top level
  "verifyConditions": [  // Explicitly exclude @semantic-release/npm
    "@semantic-release/changelog",
    "@semantic-release/exec",
    "@semantic-release/git",
    "@semantic-release/github"
  ]
}
```

Additionally, all lifecycle steps are explicitly defined to avoid inheriting any NPM-related plugins.

## CI/CD Command for Dev Branch

The GitHub Actions workflow uses this specific command for dev branch:

```bash
npx semantic-release --debug --no-ci --no-npm --extends $(pwd)/.release-dev.json
```

The flags are crucial:
- `--no-ci`: Prevents CI environment variable checks
- `--no-npm`: Explicitly disables all npm functionality
- `--extends $(pwd)/.release-dev.json`: Uses absolute path for config

## Validation

Run the validation script to verify the release configuration:

```bash
npm run verify-release-config
```

This ensures:
- Configuration files contain valid JSON
- Main branch publishes to npm properly
- Dev branch prevents npm token validation issues
- No conflicting or duplicated configuration

## GitHub Integration

The release configuration is automatically validated by GitHub Actions when:
- Changes are pushed to the configuration files
- Pull Requests modify the configuration files
- New code is pushed to `main` or `dev` branches

## Common Issues

### NPM Token Authentication Errors

If you encounter npm token authentication errors in the dev branch:

1. **Remove all references to `@semantic-release/npm`**:
   - Remove it from all lifecycle steps (verifyConditions, prepare, publish, etc.)
   - Don't include it in the plugins array
   
2. **Configure top-level settings**:
   - Set `"ci": false` at the top level
   - Set `"npmPublish": false` at the top level
   
3. **Use the correct CLI flags**:
   - Always use `--no-ci` to disable CI environment checks
   - Always use `--no-npm` to explicitly disable NPM functionality
   - Use `--extends $(pwd)/.release-dev.json` with absolute path
   
4. **Remove NPM tokens**:
   - Do not set NPM_TOKEN or NODE_AUTH_TOKEN environment variables for dev branch

### Debugging Release Issues

If you're still experiencing issues:

1. Add `NODE_DEBUG=semantic-release:*` environment variable to see more detailed logs
2. Check log output for any reference to NPM plugins
3. Verify that the configuration file is being loaded correctly
4. Look for any error messages about missing plugins or configuration

### Duplicate Configuration

Avoid having both `plugins` array and step-specific configurations (`prepare`, `publish`, etc.) as this can cause conflicts.

## Resources

- [semantic-release documentation](https://semantic-release.gitbook.io/)
- [Configuring semantic-release](https://semantic-release.gitbook.io/semantic-release/usage/configuration)
- [semantic-release plugins](https://semantic-release.gitbook.io/semantic-release/extending/plugins-list)
- [semantic-release CLI flags](https://semantic-release.gitbook.io/semantic-release/usage/configuration#configuration)
