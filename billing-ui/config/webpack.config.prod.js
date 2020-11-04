const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const url = require('url');

const baseConfig = require('./webpack.config.base');
const paths = require('./paths');

const homepagePath = require(paths.appPackageJson).homepage;
let publicPath = homepagePath ? url.parse(homepagePath).pathname : '/';
if (!publicPath.endsWith('/')) {
  // Prevents incorrect paths in file-loader
    publicPath += '/';
}

module.exports = merge(baseConfig, {
    bail: true,
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.(s[ac]ss|css)$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    'css-loader',
                    'sass-loader',
                ],
            },
            {
                include: [paths.appSrc, paths.appNodeModules],
                test: /\.(jpg|png|gif|eot|svg|ttf|woff|woff2)(\?.*)?$/,
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
                include: [paths.appSrc, paths.appNodeModules],
                test: /\.(mp4|webm)(\?.*)?$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 10000,
                            name: 'static/media/[name].[hash:8].[ext]',
                        },
                    },
                ],

            },
        ],
    },
    output: {
        chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
        filename: 'static/js/[name].[chunkhash:8].js',
        path: paths.appBuild,
        publicPath,
    },
    plugins: [
        new HtmlWebpackPlugin({
            favicon: paths.appFavicon,
            inject: true,
            minify: {
                collapseWhitespace: true,
                keepClosingSlash: true,
                minifyCSS: true,
                minifyJS: true,
                minifyURLs: true,
                removeComments: true,
                removeEmptyAttributes: true,
                removeRedundantAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true,
            },
            template: paths.appHtml,
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
});
