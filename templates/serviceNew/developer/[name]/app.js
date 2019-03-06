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
    super.shutdown();
  }

  run() {
  }
}

// Make an instance of our Service (which starts the App)
var Service = new <%= className %>({ name: "<%= className %>" });
