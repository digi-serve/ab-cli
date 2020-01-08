//
// <%= name %>
// <%= description %>
//
const AB = require("ab-utils");

var controller = AB.controller("<%= name %>");
// controller.afterStartup((cb)=>{ return cb(/* err */) });
// controller.beforeShutdown((cb)=>{ return cb(/* err */) });
controller.init();
