module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true,
    },
    "extends": "eslint:recommended",
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
                "arrays": "always",
                "objects": "always",
                "imports": "always",
                "exports": "always",
                "functions": "ignore",
            }
        ]
    }
};