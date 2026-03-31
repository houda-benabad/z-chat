const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch monorepo root so Metro can find @z-chat/shared
config.watchFolders = [workspaceRoot];

// Resolve packages from both mobile and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure Metro handles TypeScript files from packages/shared
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

module.exports = config;
