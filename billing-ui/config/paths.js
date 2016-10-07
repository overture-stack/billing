var path = require('path');

function resolveApp(relativePath) {
  return path.resolve(relativePath);
}

module.exports = {
  appBuild: resolveApp('target/classes/app'),
  appHtml: resolveApp('index.html'),
  appFavicon: resolveApp('favicon.ico'),
  appPackageJson: resolveApp('package.json'),
  appSrc: resolveApp('src'),
  appNodeModules: resolveApp('node_modules'),
  ownNodeModules: resolveApp('node_modules')
};
