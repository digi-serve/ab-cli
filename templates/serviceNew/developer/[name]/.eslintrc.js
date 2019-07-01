
//   ╔═╗╔═╗╦  ╦╔╗╔╔╦╗┬─┐┌─┐
//   ║╣ ╚═╗║  ║║║║ ║ ├┬┘│
//  o╚═╝╚═╝╩═╝╩╝╚╝ ╩ ┴└─└─┘
// A set of basic code conventions designed to encourage quality and consistency
// across your Sails app's code base.  These rules are checked against
// automatically any time you run `npm test`.
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

  // extending recommended config and config derived from eslint-config-prettier
  extends: ["eslint:recommended", "prettier"],

  // activating eslint-plugin-prettier (--fix stuff)
  plugins: ["prettier"],

  rules: {

    // customizing prettier rules (unfortunately not many of them are customizable)
    "prettier/prettier": [

      "error",
      {
        "tabWidth": 4,
        "arrowParens": "always"
      }
    ],

    // eslint rule customization here:
    "no-console": 0, // allow console.log() in our services
  }
};
