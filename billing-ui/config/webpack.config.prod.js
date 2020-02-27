const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const url = require('url');
const paths = require('./paths');

const homepagePath = require(paths.appPackageJson).homepage;
let publicPath = homepagePath ? url.parse(homepagePath).pathname : '/';
if (!publicPath.endsWith('/')) {
  // Prevents incorrect paths in file-loader
    publicPath += '/';
}

module.exports = {
    bail: true,
    devtool: 'source-map',
    entry: [require.resolve('./polyfills'), path.join(paths.appSrc, 'index')],
    output: {
        path: paths.appBuild,
        filename: 'static/js/[name].[chunkhash:8].js',
        chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
        publicPath,
    },
    resolve: {
        modules: [path.resolve(__dirname, 'src'), 'node_modules'],
        extensions: [
            '*',
            '.js',
            'jsx',
            '.json',
        ],
    },
    resolveLoader: {
        moduleExtensions: ['-loader'],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            babelrc: false,
                            presets: [
                                '@babel/preset-env',
                                '@babel/preset-react',
                                {
                                    plugins: [
                                        ['@babel/plugin-proposal-decorators', { legacy: true }],
                                        ['@babel/plugin-proposal-class-properties', { loose: true }],
                                        ['@babel/plugin-transform-runtime'],
                                        'react-hot-loader/babel',
                                        'babel-plugin-syntax-trailing-function-commas',
                                        '@babel/plugin-proposal-object-rest-spread',
                                        'add-module-exports',
                                        'babel-plugin-transform-async-to-generator',
                                        ['babel-plugin-root-import', { rootPathSuffix: 'src' }],
                                    ],
                                },
                            ],
                        },
                    },
                    // { loader: 'eslint-loader' },
                ],
                include: paths.appSrc,
            },
            {
                test: /\.(scss|sass|css)$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    'css-loader',
                    'sass-loader',
                ],
            },
            {
                test: /\.(jpg|png|gif|eot|svg|ttf|woff|woff2)(\?.*)?$/,
                include: [paths.appSrc, paths.appNodeModules],
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'static/media/[name].[hash:8].[ext]',
                        },
                    },
                ],

            },
            {
                test: /\.(mp4|webm)(\?.*)?$/,
                include: [paths.appSrc, paths.appNodeModules],
                use: [
                    {
                        loader: 'url',
                        options: {
                            limit: 10000,
                            name: 'static/media/[name].[hash:8].[ext]',
                        },
                    },
                ],

            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true,
            template: paths.appHtml,
            favicon: paths.appFavicon,
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true,
            },
        }),
        new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"production"' }),
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            options: {
                context: __dirname,
                postcss: [require('precss'), require('autoprefixer')],
            },
        }),
        new MiniCssExtractPlugin({ filename: 'static/css/[name].[contenthash:8].css' }),
    ],
};
