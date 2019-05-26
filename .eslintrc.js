module.exports = {
    "globals": {
        "angular": "readonly",
        "d3": "readonly",
        "moment": "readonly",
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
                "arrays": "always-multiline",
                "objects": "always-multiline",
                "imports": "always-multiline",
                "exports": "always-multiline",
                "functions": "ignore",
            }
        ],
        "no-unused-vars": [
            "error", {
                "argsIgnorePattern": "^_",
            }
        ],
        "strict": [
            "error",
            "never"
        ],
    }
};