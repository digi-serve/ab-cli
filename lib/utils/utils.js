//
// Utils.js
//
// A common set of reusable fn's for our resource generators.
//

// Resource
// A common object defining a Resource Generator.
// should be used like:
//    var util = require('utils/utils')
//    var Resource = new util.Resource({options});
var path = require("path");
var Resource = require(path.join(".", "resource"));

module.exports = {
  Resource
};
