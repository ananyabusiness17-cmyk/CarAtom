const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Shared Expo Metro config for CARATOM apps.
 * Do not watch apps/admin — Next.js writes `.next` paths with `?` that crash
 * Metro's Windows file watcher (lstat UNKNOWN).
 */
function createWorkspaceMetroConfig(projectRoot) {
  const workspaceRoot = path.resolve(projectRoot, '../..');
  const adminWebRoot = path.resolve(workspaceRoot, 'apps', 'admin');
  const config = getDefaultConfig(projectRoot);

  config.watchFolders = (config.watchFolders ?? []).filter((folder) => {
    const resolved = path.resolve(folder);
    return resolved !== adminWebRoot && !resolved.startsWith(adminWebRoot + path.sep);
  });

  // pnpm leaves short-lived `*_tmp_*` dirs under node_modules. Metro's Windows
  // FallbackWatcher calls fs.watch() on them; if they vanish first, that throws
  // ENOENT and kills the bundler (the error event handler never runs).
  const pnpmTmpDir = /_tmp_\d+/;
  const existingBlockList = config.resolver.blockList;
  if (Array.isArray(existingBlockList)) {
    config.resolver.blockList = [...existingBlockList, pnpmTmpDir];
  } else if (existingBlockList instanceof RegExp) {
    config.resolver.blockList = [existingBlockList, pnpmTmpDir];
  } else {
    config.resolver.blockList = pnpmTmpDir;
  }

  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ];
  config.resolver.disableHierarchicalLookup = true;
  config.resolver.unstable_enableSymlinks = true;
  config.resolver.unstable_enablePackageExports = true;

  return config;
}

module.exports = { createWorkspaceMetroConfig };
