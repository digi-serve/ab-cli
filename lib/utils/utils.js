//
// Utils.js
//
// A common set of reusable fn's for our resource generators.
//

var path = require("path");

var dirLooksLike = require(path.join(__dirname, "dirLooksLike"));
var execCommand = require(path.join(__dirname, "execCommand"));
var filePatch = require(path.join(__dirname, "filePatch"));
var fileRender = require(path.join(__dirname, "fileRender"));
var fileTemplatePath = require(path.join(__dirname, "fileTemplatePath"));
var Resource = require(path.join(__dirname, "resource"));
var stringPad = require(path.join(__dirname, "stringPad"));
var stringReplaceAll = require(path.join(__dirname, "stringReplaceAll"));

module.exports = {
  dirLooksLike,
  execCommand,
  filePatch,
  fileRender,
  fileTemplatePath,
  Resource,
  stringPad,
  stringReplaceAll
};
