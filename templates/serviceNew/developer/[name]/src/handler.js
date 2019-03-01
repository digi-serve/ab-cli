/**
 * handler
 * our Request handler.
 */
var config;

module.exports = {
  /**
   * init
   * setup our configuration & connections
   * @param {obj} options
   *        An object hash of important configuration data:
   *        .config  {obj} the config settings for this service.
   *        .DB {DBConnection} an instance of a live DB connection.
   *        ...
   */
  init: function(options) {
    options = options || {};
    config = options.config || null;
  },

  /**
   * fn
   * our Request handler.
   * @param {obj} req
   *        the request object sent by the apiSails controller.
   * @param {fn} cb
   *        a node style callback(err, results) to send data when job is finished
   */
  fn: function handler(req, cb) {
    var err;

    // if config not set, we have not be initialized properly.
    if (!config) {
      console.log("WARN: <%= serviceKey %> handler not setup properly.");
      err = new Error("<%= serviceKey %>: Missing config");
      err.code = "EMISSINGCONFIG";
      err.req = req;
      cb(err);
      return;
    }

    // check if we are enabled
    if (!config.enable) {
      // we shouldn't be getting notification.email messages
      console.log(
        "WARN: <%= name %> job received, but config.enable is false."
      );
      err = new Error("<%= serviceKey %> service is disabled.");
      err.code = "EDISABLED";
      cb(err);
      return;
    }

    // verify required parameters in job
    /*
    if (!req.email) {
      var err2 = new Error(
        ".email parameter required in <%= serviceKey %> service."
      );
      err2.code = "EMISSINGPARAM";
      cb(err2);
      return;
    }
    */

    /*
     * perform action here.
     *
     * when job is finished then:
     cb(null, { status: "success" });

     * or if error then:
     cb(err, { status: "error", error: err });

     */
  }
};
