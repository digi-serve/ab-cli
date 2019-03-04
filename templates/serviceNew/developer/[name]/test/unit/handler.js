/**
 * Handler
 * test the interface for our default service handler.
 */
var path = require("path");
var _ = require("lodash");
var expect = require("chai").expect;

// Base config value.
var defaultConfig = require(path.join(
  __dirname,
  "..",
  "..",
  "config",
  "<%= name %>"
));

// Our service handler:
var Handler = require(path.join(__dirname, "..", "..", "src", "handler"));

describe("<%= name %>: handler", function() {
  // Check for proper initialization
  describe("-> missing config", function() {
    it("should return an error when receiving a job request #missingconfig ", function(done) {
      Handler.init(null); // clear the config in case it is already set
      var request = {};
      Handler.fn(request, (err, response) => {
        expect(err).to.exist;
        expect(err).to.have.property("code", "EMISSINGCONFIG");
        expect(response).to.not.exist;
        done();
      });
    });
  });

  // handle a disabled state:
  describe("-> disabled ", function() {
    var disabledConfig = _.clone(defaultConfig, true);
    disabledConfig.enable = false;

    it("should return an error when receiving a job request #disabled ", function(done) {
      Handler.init({ config: disabledConfig });
      var request = {};
      Handler.fn(request, (err, response) => {
        expect(err).to.have.property("code", "EDISABLED");
        expect(response).to.not.exist;
        done();
      });
    });
  });
});
