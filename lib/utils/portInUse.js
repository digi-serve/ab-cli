/**
 * @function portInUse
 * check to see if the provided port already has a service
 * listening on it.
 * @param {integer} port the port # to check
 * @param {fn} callback  a callback with a single param
 *             (inUse)  : true if port is in use. false otherwise
 */
var net = require("net");

module.exports = function (port, callback) {
   // TODO: explore : lsof -i -P -n | grep :$PORT
   // as a command line way to check a port
   var server = net.createServer(function (socket) {
      socket.write("Test Ports\r\n");
      socket.pipe(socket);
   });

   server.listen(port, "127.0.0.1");
   server.on("error", function (/* e */) {
      callback(true);
   });
   server.on("listening", function (/* e */) {
      server.close();
      callback(false);
   });
};
