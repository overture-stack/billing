var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
var paths = require('./paths');
module.exports = {
  devtool: 'eval-source-map',
  mode: 'development',
  entry: [
    require.resolve('webpack-dev-server/client') + '?/',
    require.resolve('webpack/hot/only-dev-server'),
    'react-hot-loader/patch',
    require.resolve('./polyfills'),
    path.join(paths.appSrc, 'index')
  ],
  output: {
    // Next line is not used in dev but WebpackDevServer crashes without it:
    path: paths.appBuild,
    pathinfo: true,
    filename: 'static/js/bundle.js',
    publicPath: '/'
  },
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    extensions: ['.js', 'jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        use: [
          {
            loader: "babel-loader",
            options: {
              babelrc: false,
              cacheDirectory: true,
              presets: [
                ['@babel/preset-env', { modules: false }],
                '@babel/preset-react',
                {
                  'plugins': [
                    ['@babel/plugin-proposal-decorators', { "legacy": true }],
                    ['@babel/plugin-proposal-class-properties', { "loose": true }],
                    ['@babel/plugin-transform-runtime', {
                      helpers: false,
                    }],
                    'react-hot-loader/babel',
                    'babel-plugin-syntax-trailing-function-commas',
                    '@babel/plugin-proposal-object-rest-spread',
                    'add-module-exports',
                    'babel-plugin-transform-async-to-generator',
                    ['babel-plugin-root-import', { 'rootPathSuffix': 'src' }],
                  ]
                }
              ],
            },

          },
          { loader: "eslint-loader", }

        ],
        include: paths.appSrc
      },
      {
        test: /\.(scss|sass|css)$/,
        include: [paths.appSrc, paths.appNodeModules],
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(jpg|png|gif|eot|svg|ttf|woff|woff2)(\?.*)?$/,
        include: [paths.appSrc, paths.appNodeModules],
        use: [{
          loader: 'file-loader',
          options: {
            name: 'static/media/[name].[ext]'
          }
        }]
      },
      {
        test: /\.(mp4|webm)(\?.*)?$/,
        include: [paths.appSrc, paths.appNodeModules],
        use: [{
          loader: 'url',
          options: {
            limit: 10000,
            name: 'static/media/[name].[ext]'
          }
        }]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.appHtml,
      favicon: paths.appFavicon,
    }),
    new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"development"' }),
    // Note: only CSS is currently hot reloaded
    new webpack.HotModuleReplacementPlugin(),
    new CaseSensitivePathsPlugin()
  ]
};
