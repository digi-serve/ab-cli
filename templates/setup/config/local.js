/**
 * Local environment settings
 *
 * Use this file to specify configuration settings for use while developing
 * the app on your personal system.
 *
 * For more information, check out:
 * https://sailsjs.com/docs/concepts/configuration/the-local-js-file
 */
var path = require("path");

module.exports = {
   // Any configuration settings may be overridden below, whether it's built-in Sails
   // options or custom configuration specifically for your app (e.g. Stripe, Mailgun, etc.)

   /**
    * datastores:
    * Sails style DB connection settings
    */
   datastores: {
      appbuilder: {
         adapter: "sails-mysql",
         host: "db",
         port: 3306,
         user: "root",
         password: "root",
         database: "appbuilder"
      },
      site: {
         adapter: "sails-mysql",
         host: "db",
         port: 3306,
         user: "root",
         password: "root",
         database: "appbuilder-admin"
      }
   },
   /* end datastores */

   /**
    * appbuilder
    * service for managing our multi-tenant aware AB requests
    */
   appbuilder: {
      enable: true
   },
   /* end appbuilder */

   /**
    * bot_manager:
    * define the connections between our bot_manager and the host command
    * processor.
    */
   bot_manager: {},
   /* end bot_manager */

   /**
    * definition_manager
    * service for managing our multi-tenant aware AB requests
    */
   definition_manager: {
      enable: true
   },
   /* end definition_manager */

   /**
    * file_processor
    * our file manager
    */
   file_processor: {
      enable: true,
      basePath: path.sep + path.join("data"),
      // final dest: /data/[tenant.ID]/file_processor/[file]
      uploadPath: "tmp"
   },
   /* end file_processor */

   /**
    * log_manager
    * service for managing our various logs
    */
   log_manager: {
      enable: true
   },
   /* end log_manager */

   /**
    * notification_email
    * our smtp email service
    */
   notification_email: {},
   /* end notification_email */

   /**
    * process_manager
    * manages processes
    */
   process_manager: {
      enable: true
   },
   /* end process_manager */

   /**
    * tenant_manager
    * manages the different tenants in our system
    */
   tenant_manager: {
      enable: true,
      // {bool} enable the tenant_manager service.
      // don't turn this off.  You wont like it if you turn it off.

      siteTenantID: "admin"
      // {string} the uuid of what is considered the "Admin" Tenant.
      // this resolves to the Tenant Manager Site, and is established on
      // install.  It can be reconfigured ... but only if you know what
      // you are doing.
      // You have been warned ...
   },
   /* end tenant_manager */

   /**
    * user_manager
    * manage the users withing a tenant
    */
   user_manager: {
      enable: true
   }
   /* end user_manager */
};
