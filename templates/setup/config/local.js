/**
 * Local environment settings
 *
 * Use this file to specify configuration settings for use while developing
 * the app on your personal system.
 *
 * For more information, check out:
 * https://sailsjs.com/docs/concepts/configuration/the-local-js-file
 */

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
      database: "site"
    }
  },
  /* end datastores */

  /**
   * bot_manager:
   * define the connections between our bot_manager and the host command
   * processor.
   */
  bot_manager: {},
  /* end bot_manager */

  /**
   * notification_email
   * our smtp email service
   */
  notification_email: {}
  /* end notification_email */
};
