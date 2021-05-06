/**
 * <%= action %>
 * our Request handler.
 */

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.

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
      req.log("<%= key %>:");

      // get the AB for the current tenant
      ABBootstrap.init(req)
         .then((AB) => { // eslint-disable-line
            // access your config settings if you need them:
            /*
            var config = req.config();
             */

            // Get the passed in parameters
            /*
            var email = req.param("email");

            var id = req.param("objectID");
            var object = AB.objectByID(id);
            if (!object) {
               object = AB.queryByID(id);
            }
            if (!object) {
               return Errors.missingObject(id, req, cb);
            }
            */

            /*
             * perform action here.
             *
             * when job is finished then:
            cb(null, { param: "value" });

             * or if error then:
            cb(err);

             * example:
            var object = AB.objectByID(id);
            object.model().findAll({ email })
               .then((list) => {
                  cb(null, list);
               })
               .catch((err) => {
                  cb(err);
               });

             */
            cb(null, { status: "success" });
         })
         .catch((err) => {
            req.notify.developer(err, {
               context: "Service:<%= key %>: Error initializing ABFactory",
            });
            cb(err);
         });
   },
};
