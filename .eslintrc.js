// eslint-disable-next-line no-undef
module.exports = {
    extends: "@ionic/eslint-config/recommended",
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
        ]
    }
}