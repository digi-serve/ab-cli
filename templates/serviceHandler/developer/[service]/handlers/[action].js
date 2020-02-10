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
      //

      // access your config settings if you need them:
      /*
      var config = req.config();
       */

      // Get the passed in parameters
      /*
      var email = req.param("email");
       */

      // access any Models you need
      /*
      var Model = req.model("Name");
       */

      /*
       * perform action here.
       *
       * when job is finished then:
      cb(null, { param: "value" });

       * or if error then:
      cb(err);

       * example:
      Model.find({ email })
         .then((list) => {
            cb(null, list);
         })
         .catch((err) => {
            cb(err);
         });

       */
      cb(null, { status: "success" });
   },

   /**
    * inputValidation
    * define the expected inputs to this service handler:
    * Format:
    * "parameterName" : {
    *    "required" : {bool},  // default = false
    *    "validation" : {fn|obj},
    *                   {fn} a function(value) that returns true/false if
    *                        the value is valid.
    *                   {obj}: .type: {string} the data type
    *                                 [ "string", "uuid", "email", "number", ... ]
    * }
    */
   inputValidation: {
      // uuid: {
      //    required: true,
      //    validation: { type: "uuid" }
      // }
   }
};
