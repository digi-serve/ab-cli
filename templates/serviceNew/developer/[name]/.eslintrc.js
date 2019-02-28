
//   ╔═╗╔═╗╦  ╦╔╗╔╔╦╗┬─┐┌─┐
//   ║╣ ╚═╗║  ║║║║ ║ ├┬┘│
//  o╚═╝╚═╝╩═╝╩╝╚╝ ╩ ┴└─└─┘
// A set of basic code conventions designed to encourage quality and consistency
// across your Sails app's code base.  These rules are checked against
// automatically any time you run `npm test`.
//
// > An additional eslintrc override file is included in the `assets/` folder
// > right out of the box.  This is specifically to allow for variations in acceptable
// > global variables between front-end JavaScript code designed to run in the browser
// > vs. backend code designed to run in a Node.js/Sails process.
//
// > Note: If you're using mocha, you'll want to add an extra override file to your
// > `test/` folder so that eslint will tolerate mocha-specific globals like `before`
// > and `describe`.
// Designed for ESLint v4.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// For more information about any of the rules below, check out the relevant
// reference page on eslint.org.  For example, to get details on "no-sequences",
// you would visit `http://eslint.org/docs/rules/no-sequences`.  If you're unsure
// or could use some advice, come by https://sailsjs.com/support.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = {
  "env": {
    "node": true
  },

  "parserOptions": {
    "ecmaVersion": 8
  },

  // "parser": "babel-eslint",
  extends: ["eslint:recommended", "prettier"], // extending recommended config and config derived from eslint-config-prettier
  plugins: ["prettier"], // activating esling-plugin-prettier (--fix stuff)
  rules: {
    "prettier/prettier": [
      // customizing prettier rules (unfortunately not many of them are customizable)
      "error",
      {
        // singleQuote: true,
        // trailingComma: "all"
      }
    ],
    "no-console": 0, // "off",
    // eqeqeq: ["error", "always"] // adding some custom ESLint rules
  }
};
