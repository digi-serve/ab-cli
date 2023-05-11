module.exports = {
   env: {
      node: true,
      browser: true,
      es2020: true,
   },

   parserOptions: {
      ecmaVersion: 2020,
   },

   // "parser": "babel-eslint",
   extends: ["eslint:recommended", "prettier"], // extending recommended config and config derived from eslint-config-prettier
   plugins: ["prettier"], // activating esling-plugin-prettier (--fix stuff)
   rules: {
      "prettier/prettier": [
         // customizing prettier rules (unfortunately not many of them are customizable)
         "error",
         {
            arrowParens: "always",
            endOfLine: "lf",
            printWidth: 80,
            tabWidth: 3,
         },
      ],
      "no-console": "off",
      // eqeqeq: ["error", "always"] // adding some custom ESLint rules
   },
};
