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
1. Ensure `npmPublish` is set to `false` in `.release-dev.json`
2. Remove `@semantic-release/npm` from the `verifyConditions` array
3. Set empty NPM tokens in the GitHub workflow for the dev branch

### Duplicate Configuration

Avoid having both `plugins` array and step-specific configurations (`prepare`, `publish`, etc.) as this can cause conflicts.

## Resources

- [semantic-release documentation](https://semantic-release.gitbook.io/)
- [Configuring semantic-release](https://semantic-release.gitbook.io/semantic-release/usage/configuration)
- [semantic-release plugins](https://semantic-release.gitbook.io/semantic-release/extending/plugins-list)
