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
    * inputValidation
    * define the expected inputs to this service handler:
    * Format:
    * "parameterName" : {
    *    {joi.fn}   : {bool},  // performs: joi.{fn}();
    *    {joi.fn}   : {
    *       {joi.fn1} : true,   // performs: joi.{fn}().{fn1}();
    *       {joi.fn2} : { options } // performs: joi.{fn}().{fn2}({options})
    *    }
    *    // examples:
    *    "required" : {bool},
    *    "optional" : {bool},
    *
    *    // custom:
    *        "validation" : {fn} a function(value, {allValues hash}) that
    *                       returns { error:{null || {new Error("Error Message")} }, value: {normalize(value)}}
    * }
    */
   inputValidation: {
      // uuid: { string: { uuid: true }, required: true },
      // email: { string: { email: true }, optional: true },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the
    *        api_sails/api/controllers/<%= service %>/<%= action %>.
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
   }
};
