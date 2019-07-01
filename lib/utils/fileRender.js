/**
 * @function fileRender
 * return the contents of a file with the given ejs template data
 * replaced.
 * @param {string} filePath path to the file to open
 * @param {obj} data  key=>value hash of ejs template variables
 * @return {string}
 */
var ejs = require("ejs");
var fs = require("fs");

module.exports = function(filePath, data) {
    data = data || {};
    data.filename = data.filename || filePath;

    var contents = fs.readFileSync(filePath, "utf8");
    var ret = ejs.render(contents, data);

    return ret;
};
