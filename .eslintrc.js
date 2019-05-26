module.exports = {
    "globals": {
        "angular": "readonly",
        "d3": "readonly",
    },
    "env": {
        "browser": true,
        "es6": true,
        "node": true,
    },
    "extends": [
        "eslint:recommended"
    ],
    "plugins": [
    ],
    "rules": {
        "indent": [
            "error",
            4,
        ],
        "linebreak-style": [
            "error",
            "unix",
        ],
        "quotes": [
            "error",
            "double",
        ],
        "semi": [
            "error",
            "always",
        ],
        "no-console": [
            "error",
            {
                allow: [
                    "warn",
                    "error",
                    "log",
                ]
            }
        ],
        "comma-dangle": [
            "error", {
                "arrays": "only-multiline",
                "objects": "only-multiline",
                "imports": "only-multiline",
                "exports": "only-multiline",
                "functions": "ignore",
            }
        ],
        "no-unused-vars": [
            "error", {
                "argsIgnorePattern": "^_",
            }
        ],
    }
};