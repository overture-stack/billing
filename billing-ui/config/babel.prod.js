module.exports = {
  babelrc: false,
  presets: [
    'babel-preset-es2015',
    'babel-preset-es2016',
    'babel-preset-react'
  ].map(require.resolve),
  plugins: [
    'babel-plugin-transform-decorators-legacy',
    'babel-plugin-transform-decorators',
    'babel-plugin-transform-class-properties',
    'babel-plugin-syntax-trailing-function-commas',
    'babel-plugin-transform-class-properties',
    'babel-plugin-transform-object-rest-spread',
    'babel-plugin-transform-react-constant-elements',
    'babel-plugin-add-module-exports',
    'babel-plugin-transform-async-to-generator',
  ].map(require.resolve).concat([
    [require.resolve('babel-plugin-transform-runtime'), {
      helpers: false,
      polyfill: false,
      regenerator: true
    }],
    ['babel-root-import', { 'rootPathSuffix': 'src' }],
  ])
};
