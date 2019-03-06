//
// Utils.js
//
// A common set of reusable fn's for our resource generators.
//

var path = require("path");

var checkDependencies = require(path.join(__dirname, "checkDependencies"));
var dirLooksLike = require(path.join(__dirname, "dirLooksLike"));
var dirLooksLikeRoot = require(path.join(__dirname, "dirLooksLikeRoot"));
var dirMoveToRoot = require(path.join(__dirname, "dirMoveToRoot"));
var execCommand = require(path.join(__dirname, "execCommand"));
var fileCopyTemplates = require(path.join(__dirname, "fileCopyTemplates"));
var filePatch = require(path.join(__dirname, "filePatch"));
var fileRender = require(path.join(__dirname, "fileRender"));
var fileTemplatePath = require(path.join(__dirname, "fileTemplatePath"));
var Resource = require(path.join(__dirname, "resource"));
var stringPad = require(path.join(__dirname, "stringPad"));
var stringRender = require(path.join(__dirname, "stringRender"));
var stringReplaceAll = require(path.join(__dirname, "stringReplaceAll"));

module.exports = {
  checkDependencies,
  dirLooksLike,
  dirLooksLikeRoot,
  dirMoveToRoot,
  execCommand,
  fileCopyTemplates,
  filePatch,
  fileRender,
  fileTemplatePath,
  Resource,
  stringPad,
  stringRender,
  stringReplaceAll
};
