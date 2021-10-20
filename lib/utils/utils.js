//
// Utils.js
//
// A common set of reusable fn's for our resource generators.
//

var path = require("path");
const { v4: uuid } = require("uuid");

var checkDependencies = require(path.join(__dirname, "checkDependencies"));
var configInit = require(path.join(__dirname, "configInit"));
var cryptoHash = require(path.join(__dirname, "cryptoHash"));
var cryptoPassword = require(path.join(__dirname, "cryptoPassword"));
var dbInit = require(path.join(__dirname, "dbInit"));
var dirLooksLike = require(path.join(__dirname, "dirLooksLike"));
var dirLooksLikeRoot = require(path.join(__dirname, "dirLooksLikeRoot"));
var dirMoveToRoot = require(path.join(__dirname, "dirMoveToRoot"));
var execCli = require(path.join(__dirname, "execCli"));
var execCommand = require(path.join(__dirname, "execCommand"));
var fileCopyTemplates = require(path.join(__dirname, "fileCopyTemplates"));
var filePatch = require(path.join(__dirname, "filePatch"));
var fileRender = require(path.join(__dirname, "fileRender"));
var fileTemplatePath = require(path.join(__dirname, "fileTemplatePath"));
var findAllServices = require(path.join(__dirname, "findAllServices"));
var gitCheckout = require(path.join(__dirname, "gitCheckout"));
var gitInstallPlugins = require(path.join(__dirname, "gitInstallPlugins"));
var gitInstallServices = require(path.join(__dirname, "gitInstallServices"));
var gitScanDevYML = require(path.join(__dirname, "gitScanDevYML"));
var gitSubmoduleAdd = require(path.join(__dirname, "gitSubmoduleAdd"));
var httpPost = require(path.join(__dirname, "httpPost"));
var optionsPull = require(path.join(__dirname, "optionsPull"));
var portInUse = require(path.join(__dirname, "portInUse"));
var Resource = require(path.join(__dirname, "resource"));
var stringPad = require(path.join(__dirname, "stringPad"));
var stringRender = require(path.join(__dirname, "stringRender"));
var stringReplaceAll = require(path.join(__dirname, "stringReplaceAll"));
var unstringifyBools = require(path.join(__dirname, "unstringifyBools"));

module.exports = {
   checkDependencies,
   configInit,
   cryptoHash,
   cryptoPassword,
   dbInit,
   dirLooksLike,
   dirLooksLikeRoot,
   dirMoveToRoot,
   execCli,
   execCommand,
   fileCopyTemplates,
   filePatch,
   fileRender,
   fileTemplatePath,
   findAllServices,
   gitCheckout,
   gitInstallPlugins,
   gitInstallServices,
   gitScanDevYML,
   gitSubmoduleAdd,
   httpPost,
   optionsPull,
   portInUse,
   Resource,
   stringPad,
   stringRender,
   stringReplaceAll,
   unstringifyBools,
   uuid,
};
