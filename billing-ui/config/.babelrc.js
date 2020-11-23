module.exports = {
    env: {
        production: {
            plugins: [
                'babel-plugin-dev-expression'
            ]
        },
        development: {
            plugins: [
                '@babel/plugin-transform-classes',
            ],
        }
    },
    ignore: [
        /node_modules/,
    ],
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: "current",
                },
                useBuiltIns: "usage",
                corejs: 2,
            },
        ],
        '@babel/preset-react',
    ],
    plugins: [
        'add-module-exports',
        'lodash',
        'react-hot-loader/babel',
        [
            '@babel/plugin-proposal-decorators',
            {
                legacy: true
            }
        ],
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-json-strings',
        '@babel/plugin-proposal-export-namespace-from',
        '@babel/plugin-proposal-numeric-separator',
        '@babel/plugin-proposal-logical-assignment-operators',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-transform-runtime',
    ],
}
