const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const babelConfig = require('./.babelrc');
const paths = require('./paths');

module.exports = {
    entry: [require.resolve('./polyfills'), path.join(paths.appSrc, 'index')],
    module: {
        rules: [
            {
                enforce: 'pre',
                exclude: /node_modules/,
                include: paths.appSrc,
                test: /\.js$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: babelConfig,
                    },
                    // { loader: 'eslint-loader' },
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            favicon: paths.appFavicon,
            inject: true,
            template: paths.appHtml,
        }),
        new webpack.ProvidePlugin({
            PropTypes: 'prop-types',
            React: 'react',
        }),
        new CaseSensitivePathsPlugin(),
    ],
    resolve: {
        alias: {
            assets: path.resolve(__dirname, '../src/assets'),
            components: path.resolve(__dirname, '../src/components'),
            layouts: path.resolve(__dirname, '../src/layouts'),
            pages: path.resolve(__dirname, '../src/pages'),
            'react-dom': '@hot-loader/react-dom',
            services: path.resolve(__dirname, '../src/services'),
            styles: path.resolve(__dirname, '../src/styles'),
            utils: path.resolve(__dirname, '../src/utils'),
        },
        extensions: [
            '.js',
            'jsx',
            '.json',
        ],
        modules: [path.resolve(__dirname, '../src'), 'node_modules'],
    },
};
