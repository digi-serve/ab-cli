//
// <%= name %>
// <%= description %>
//
const AB = require("ab-utils");

var controller = AB.controller("<%= name %>");
// controller.afterStartup((req, cb)=>{ return cb(/* err */) });
// controller.beforeShutdown((req, cb)=>{ return cb(/* err */) });
// controller.waitForDB = true; // {bool} wait for mysql to be accessible before .init() is processed
controller.init();
