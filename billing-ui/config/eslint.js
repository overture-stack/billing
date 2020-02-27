// Inspired by https://github.com/airbnb/javascript but less opinionated.

// We use eslint-loader so even warnings are very visibile.
// This is why we only use "WARNING" level for potential errors,
// and we don't use "ERROR" level at all.

// In the future, we might create a separate list of rules for production.
// It would probably be more strict.

module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es6: true,
        node: true,
    },
    extends: ['airbnb', 'plugin:react/recommended'],
    globals: {
        PropTypes: false,
        React: false,
    },
    parser: 'babel-eslint',
    parserOptions: {
        ecmaFeatures: {
            experimentalObjectRestSpread: true,
            generators: true,
            jsx: true,
        },
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    plugins: [
        'react',
        'react-hooks',
        'sort-destructure-keys',
        // 'jsx-a11y',
        // 'import', // disabled, scroll below to see why
    ],
    root: true,
    rules: {
        'array-bracket-newline': [
            'error',
            {
                minItems: 3,
                multiline: true,
            },
        ],
        'array-element-newline': [
            'warn',
            {
                minItems: 3,
                multiline: true,
            },
        ],
        'arrow-body-style': 'off',
        'arrow-parens': 'off',
        camelcase: [
            'warn',
            {
                allow: [
                    '^UNSAFE_',
                    'doc_count',
                    '^active_',
                ],
            },
        ],
        'comma-dangle': ['warn', 'always-multiline'],
        'consistent-return': [
            'warn',
            {
                treatUndefinedAsUnspecified: true,
            },
        ],
        'func-names': ['warn', 'as-needed'],
        'function-paren-newline': ['warn', 'consistent'],
        'implicit-arrow-linebreak': 'off',
        indent: [
            'warn',
            4,
            {
                ArrayExpression: 'first',
                CallExpression: { arguments: 'first' },
                flatTernaryExpressions: true,
                FunctionDeclaration: { parameters: 'first' },
                FunctionExpression: { parameters: 'first' },
                ignoreComments: true,
                ignoredNodes: [
                    'ConditionalExpression',
                    'JSXAttribute',
                    'JSXClosingElement',
                    'JSXElement',
                    'JSXElement > *',
                    'JSXEmptyExpression',
                    'JSXExpressionContainer',
                    'JSXIdentifier',
                    'JSXMemberExpression',
                    'JSXNamespacedName',
                    'JSXOpeningElement',
                    'JSXSpreadAttribute',
                    'JSXSpreadChild',
                    'JSXText',
                    'TemplateLiteral > *',
                ],
                ImportDeclaration: 'first',
                MemberExpression: 1,
                ObjectExpression: 'first',
                SwitchCase: 1,
                VariableDeclarator: 'first',
            },
        ],
        'multiline-ternary': ['warn', 'always-multiline'],
        'no-console': [
            'warn',
            {
                allow: [
                    'info',
                    'warn',
                    'error',
                ],
            },
        ],
        'no-debugger': 'warn',
        'no-fallthrough': [
            'warn',
            {
                commentPattern: 'break[\\s\\w]*omitted',
            },
        ],
        'no-nested-ternary': 'off',
        'no-unneeded-ternary': 'warn',
        'no-unused-expressions': [
            'warn',
            {
                allowShortCircuit: true,
                allowTaggedTemplates: true,
                allowTernary: true,
            },
        ],
        'no-var': 'error', // Must use const or let.
        'object-curly-newline': 'warn', // ['warn', {
        'object-property-newline': [
            'warn',
            {
      // allowAllPropertiesOnSameLine: false,
            },
        ],
    // ObjectExpression: {
    //   'multiline': true,
    //   'minProperties': 2,
    // },
    // ObjectPattern: {
    //   'multiline': true,
    //   'minProperties': 2,
    // },
    // ImportDeclaration: {
    //   'multiline': true,
    //   'minProperties': 2,
    // },
    // ExportDeclaration: {
    //   'multiline': true,
    //   'minProperties': 2,
    // },
    // }],
        'operator-linebreak': [
            'warn',
            'after',
            {
                overrides: {
                    ':': 'before',
                    '?': 'before',
                },
            },
        ],
        'padded-blocks': 'error',
        semi: ['warn', 'always'],
        'sort-keys': [
            'warn',
            'asc',
            {
                caseSensitive: false,
                natural: true,
            },
        ],
        quotes: ['warn', 'single'],
    // 'import/no-extraneous-dependencies': ['warn', {
    //   'packageDir': './'
    // }],
        'import/extensions': 'off',
        'react/jsx-closing-bracket-location': ['warn', 'props-aligned'],
        'react/jsx-filename-extension': [
            'warn',
            {
                extensions: [
                    '.js',
                    '.jsx',
                    '.tsx',
                ],
            },
        ],
        'react/jsx-first-prop-new-line': ['warn', 'multiline'],
        'react/jsx-fragments': ['error', 'element'],
        'react/jsx-indent': [
            'warn',
            4,
            {
                checkAttributes: true,
                indentLogicalExpressions: true,
            },
        ],
        'react/jsx-indent-props': ['warn', 4],
        'react/jsx-max-props-per-line': [
            'warn',
            {
                maximum: 1,
                when: 'multiline',
            },
        ],
        'react/jsx-one-expression-per-line': [
            'warn',
            {
                allow: 'single-child',
            },
        ],
        'react/jsx-sort-default-props': 'error',
        'react/jsx-sort-props': [
            'warn',
            {
                ignoreCase: true,
            },
        ],
        'react/jsx-tag-spacing': [
            'warn',
            {
                afterOpening: 'never',
                beforeClosing: 'never',
                beforeSelfClosing: 'always',
                closingSlash: 'never',
            },
        ],
        'react/jsx-wrap-multilines': [
            'error',
            {
                arrow: 'parens-new-line',
                assignment: 'parens-new-line',
                condition: 'parens-new-line',
                declaration: 'parens-new-line',
                logical: 'parens-new-line',
                prop: 'parens-new-line',
                return: 'parens-new-line',
            },
        ],
        'react/no-did-mount-set-state': 'warn',
        'react/no-did-update-set-state': 'warn',
        'react/no-direct-mutation-state': 'warn',
        'react/no-multi-comp': 'warn',
        'react/no-unknown-property': 'warn',
        'react/sort-comp': 'warn',
        'react/sort-prop-types': 'error',
        'react/state-in-constructor': ['warn', 'never'],
        'react/prop-types': 'off', // Disable prop-types for now.
        'sort-destructure-keys/sort-destructure-keys': [
            'warn',
            {
                caseSensitive: false,
            },
        ],
        // https://github.com/evcohen/eslint-plugin-jsx-a11y/tree/master/docs/rules
        // 'jsx-a11y/aria-role': 'warn',
        // 'jsx-a11y/img-redundant-alt': 'warn',
        // 'jsx-a11y/no-access-key': 'warn',

    },
    settings: {
        'import/extensions': ['.js'],
        'import/ignore': ['node_modules', '\\.(json|css|jpg|png|gif|eot|svg|ttf|woff|woff2|mp4|webm)$'],
        'import/resolver': {
            node: {
                extensions: ['.js', '.json'],
            },
        },
        react: {
            version: 'detect',
        },
    },
};
