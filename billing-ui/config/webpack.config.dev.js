const webpack = require('webpack');
const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const baseConfig = require('./webpack.config.base');
const paths = require('./paths');
const { target: targetEndpoint } = require('../config');

module.exports = merge(baseConfig, {
    devServer: {
        contentBase: './build',
        historyApiFallback: {
            rewrites: [
                {
                    from: /^\/releases\/.*$/,
                    to: '/',
                },
            ],
        },
        hot: true,
        port: process.env.PORT || 3500,
        proxy: {
            '/api/**': {
                pathRewrite: { '^/api': '' },
                secure: false,
                target: targetEndpoint,
            },
        },
    },
    devtool: 'eval-source-map',
    entry: [`${require.resolve('webpack-dev-server/client')}?/`, 'react-hot-loader/patch'],
    mode: 'development',
    module: {
        rules: [
            {
                include: [paths.appSrc, paths.appNodeModules],
                test: /\.(s[ac]ss|css)$/,
                use: [
                    'style-loader',
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
                            name: 'static/media/[name].[ext]',
                        },
                    },
                ],
            },
            {
                include: [paths.appSrc, paths.appNodeModules],
                test: /\.(mp4|webm)(\?.*)?$/,
                use: [
                    {
                        loader: 'url',
                        options: {
                            limit: 10000,
                            name: 'static/media/[name].[ext]',
                        },
                    },
                ],
            },
        ],
    },
    output: {
        filename: 'static/js/bundle.js',
        path: paths.appBuild,
        pathinfo: true,
        publicPath: '/',
    },
    plugins: [
        new HtmlWebpackPlugin({
            favicon: paths.appFavicon,
            inject: true,
            template: paths.appHtml,
        }),
        new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"development"' }),
    // Note: only CSS is currently hot reloaded
        new webpack.HotModuleReplacementPlugin(),
        new CaseSensitivePathsPlugin(),
    ],
});
