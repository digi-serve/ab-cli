/**
 * <%= action %>
 * our Request handler.
 */

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "<%= key %>",

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the api_sails/api/controllers/<%= service %>/<%= action %>.
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */
   fn: function handler(req, cb) {
      var err;

      var config = req.config();

      // if config not set, we have not be initialized properly.
      if (!config) {
         req.log("WARN: <%= key %> handler not setup properly.");
         err = new Error("<%= key %>: Missing config");
         err.code = "EMISSINGCONFIG";
         err.req = req;
         cb(err);
         return;
      }

      // check if we are enabled
      if (!config.enable) {
         // we shouldn't be getting notification.email messages
         req.log(
            "WARN: <%= service %> job received, but config.enable is false."
         );
         err = new Error("<%= key %> service is disabled.");
         err.code = "EDISABLED";
         cb(err);
         return;
      }

      // verify required parameters in job
      /*
      var email = req.param("email");
      if (!email) {
         var err2 = new Error(
            ".email parameter required in <%= key %> service."
         );
         err2.code = "EMISSINGPARAM";
         cb(err2);
         return;
      }
      */

      // access any Models you need
      /*
      var Model = req.model("Name");
      Model.find().then().catch();
       */

      /*
       * perform action here.
       *
       * when job is finished then:
      cb(null, { status: "success" });

       * or if error then:
      cb(err, { status: "error", error: err });
       */
      cb(null, { status: "success" });
   }
};
