// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

// Find the project and workspace root directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force Metro to resolve @taik/speech-engine to the workspace package root
//    (so Metro can honor the package.json `react-native` entrypoint).
config.resolver.extraNodeModules = {
  '@taik/speech-engine': path.resolve(monorepoRoot, 'packages/speech-engine'),
};

// 4. Redirect Node.js-specific adapters to React Native stub
const speechEngineDist = path.resolve(monorepoRoot, 'packages/speech-engine/dist');
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect node-adapter.js and edge-adapter.js to the stub version
  if (moduleName.endsWith('node-adapter.js') || moduleName.endsWith('edge-adapter.js')) {
    const stubPath = path.join(speechEngineDist, 'runtime', 'node-adapter.js');
    // Check if request is from speech-engine package
    if (context.originModulePath && context.originModulePath.includes('speech-engine')) {
      return {
        filePath: stubPath,
        type: 'sourceFile',
      };
    }
  }

  // Use default resolver for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withStorybook(config);
