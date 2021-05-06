/**
 * @function fileTemplatePath
 * return the path to our templates directory.
 * @return {string}
 */
var path = require("path");

module.exports = function () {
   return path.resolve(__dirname, "../../templates");
};
