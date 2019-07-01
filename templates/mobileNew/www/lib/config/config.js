/*
 * config.js
 * a single config file that compiles all the rest.
 * this file is the one imported by the rest of the application.
 */
var codepush = require("./codepush.js");
var sentryio = require("./sentryio.js");

// local.js
// provide any overrides from the default config files.
// most of these will be specific IDs required to configure
// our services
var local = require("./local.js");

var config = {
    codepush: codepush,
    sentryio: sentryio
};

// now combine our default configs into our local
_.defaultsDeep(local, config);

module.exports = local;
