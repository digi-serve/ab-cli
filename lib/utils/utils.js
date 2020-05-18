//
// Utils.js
//
// A common set of reusable fn's for our resource generators.
//

var path = require("path");

var checkDependencies = require(path.join(__dirname, "checkDependencies"));
var cryptoHash = require(path.join(__dirname, "cryptoHash"));
var cryptoPassword = require(path.join(__dirname, "cryptoPassword"));
var dbInit = require(path.join(__dirname, "dbInit"));
var dirLooksLike = require(path.join(__dirname, "dirLooksLike"));
var dirLooksLikeRoot = require(path.join(__dirname, "dirLooksLikeRoot"));
var dirMoveToRoot = require(path.join(__dirname, "dirMoveToRoot"));
var execCommand = require(path.join(__dirname, "execCommand"));
var fileCopyTemplates = require(path.join(__dirname, "fileCopyTemplates"));
var filePatch = require(path.join(__dirname, "filePatch"));
var fileRender = require(path.join(__dirname, "fileRender"));
var fileTemplatePath = require(path.join(__dirname, "fileTemplatePath"));
var findAllServices = require(path.join(__dirname, "findAllServices"));
var gitCheckout = require(path.join(__dirname, "gitCheckout"));
var gitInstallServices = require(path.join(__dirname, "gitInstallServices"));
var gitScanDevYML = require(path.join(__dirname, "gitScanDevYML"));
var optionsPull = require(path.join(__dirname, "optionsPull"));
var portInUse = require(path.join(__dirname, "portInUse"));
var Resource = require(path.join(__dirname, "resource"));
var stringPad = require(path.join(__dirname, "stringPad"));
var stringRender = require(path.join(__dirname, "stringRender"));
var stringReplaceAll = require(path.join(__dirname, "stringReplaceAll"));
var unstringifyBools = require(path.join(__dirname, "unstringifyBools"));

module.exports = {
   checkDependencies,
   cryptoHash,
   cryptoPassword,
   dbInit,
   dirLooksLike,
   dirLooksLikeRoot,
   dirMoveToRoot,
   execCommand,
   fileCopyTemplates,
   filePatch,
   fileRender,
   fileTemplatePath,
   findAllServices,
   gitCheckout,
   gitInstallServices,
   gitScanDevYML,
   optionsPull,
   portInUse,
   Resource,
   stringPad,
   stringRender,
   stringReplaceAll,
   unstringifyBools
};
