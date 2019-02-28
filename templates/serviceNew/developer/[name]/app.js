//
// <%= name %>
// <%= description %>
//
const path = require("path");
const AB = require("ab-utils");

const config = AB.config("<%= name %>");

const cote = require("cote");
const serviceResponder = new cote.Responder({ name: "<%= name %>" });

const ABService = AB.service;

const Handler = require(path.join(__dirname, "src", "handler.js"));
Handler.init(config);

//
// <%= className %> Service
// Create an instance of ABService that defines the unique actions:
//  .startup()  : initialize data & communications
//  .shutdown() : shutdown communications & data
//  .run()      : perform your unique actions
class <%= className %> extends ABService {
  // startup() {
  //   super.startup();
  // }

  shutdown() {
    serviceResponder.off("<%= serviceKey %>", Handler.fn);
    super.shutdown();
  }

  run() {
    serviceResponder.on("<%= serviceKey %>", Handler.fn);
  }
}

// Make an instance of our Service (which starts the App)
/* eslint-disable no-unused-vars */
var Service = new <%= className %>({ name: "<%= className %>" });
