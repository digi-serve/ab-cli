//
// SSL
//
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var Command = new utils.Resource({
  command: "ssl",
  params: "--auto ||  --pathKey [pathToKey] --pathCert [pathToCert]",
  descriptionShort: "setup ssl encryption in AppBuilder installation.",
  descriptionLong: `
`
});

module.exports = Command;
