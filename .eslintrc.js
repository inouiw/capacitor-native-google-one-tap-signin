module.exports = {
    extends: [
        "@ionic/eslint-config/recommended",
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json']
    },
    ignorePatterns: ['/.eslintrc.js'],
    rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "no-async-promise-executor": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }
        ],
        "@typescript-eslint/no-floating-promises": "error"
    }
}