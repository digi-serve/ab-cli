/**
 * <%= service %>/<%= action %>.js
 *
 *
 * url:     <%= verb %> <%= route %>
 * header:  X-CSRF-Token : [token]
 * params:
 */

var inputParams = {
   /*    "email": { required:true, validation:{ type: "email" } }   */
};

// make sure our BasePath is created:
module.exports = function(req, res) {
   // Package the Find Request and pass it off to the service

   req.ab.log(`<%= service %>::<%= action %>`);

   // verify your inputs are correct:
   // false : prevents an auto error response if detected. (default: true)
   if (!req.ab.validateParameters(inputParams /*, false */)) {
      // an error message is automatically returned to the client
      // so be sure to return here;
      return;
   }

   // create a new job for the service
   let jobData = {
      // your data here
   };

   // pass the request off to the uService:
   req.ab.serviceRequest("<%= key %>", jobData, (err, results) => {
      if (err) {
         res.ab.error(err);
         return;
      }
      res.ab.success(results);
   });
};
