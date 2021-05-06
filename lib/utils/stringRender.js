/**
 * @function stringRender
 *
 * Treat the given string as a template, that has placeholders to be filled
 * by the given obj properties.
 *
 * NOTE: place holders will be the obj properties with a '[' & ']' around it.
 * @codestart
 * var render = require("stringRender.js");
 * var data = { name:'myModule', id:1 };
 * var template = '/module/[name]/[id]';
 * var actual = render(template, data);
 * // actual == '/module/myModule/1'
 * @codeend
 *
 * @param {string} template string with placeholders
 * @param {object} obj  template data
 * @param {string} tagOpen  the template tag opening (default: '[')
 * @param {string} tagClose the closing template tag (default: ']')
 * @return {string} template with given data replaced
 */
var path = require("path");
var replaceAll = require(path.join(__dirname, "stringReplaceAll.js"));
module.exports = function (template, obj, tagOpen, tagClose) {
   if (tagOpen === undefined) tagOpen = "[";
   if (tagClose === undefined) tagClose = "]";

   for (var o in obj) {
      var key = tagOpen + o + tagClose;
      template = replaceAll(template, key, obj[o]); //orig.replace('['+o+']', obj[o]);
   }
   return template;
};
