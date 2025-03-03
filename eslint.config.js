module.exports = [
    {
        files: ['*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'commonjs',
        },
        rules: {
            'no-var': 'error',
            'prefer-const': 'error',
            'no-console': 'off',
            'no-debugger': 'warn',
            'no-undef': 'error',
            'no-unused-vars': 'warn',
            'quotes': ['error', 'single'],
            'semi': ['error', 'never'],
            'new-cap': 2,
            'no-caller': 2,
            'dot-notation': 0,
            'no-eq-null': 2,
            'no-unused-expressions': 0,
            'curly': 0,
            'eqeqeq': 2,
            'wrap-iife': [2, 'any'],
            'no-use-before-define': [
                2,
                {
                    functions: false,
                },
            ],
            'indent': ['warn', 4]
        },
    },
]
  