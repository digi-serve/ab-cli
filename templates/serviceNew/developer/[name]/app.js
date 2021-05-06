//
// <%= name %>
// <%= description %>
//
const AB = require("ab-utils");

var controller = AB.controller("<%= name %>");
// controller.afterStartup((req, cb)=>{ return cb(/* err */) });
// controller.beforeShutdown((req, cb)=>{ return cb(/* err */) });
controller.init();
