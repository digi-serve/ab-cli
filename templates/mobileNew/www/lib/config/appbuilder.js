/*
 * appbuilder.js
 * platform configuration options.
 */

module.exports = {
    /*
     * maID
     * The unique id for this Mobile App.  Used to retrieve the AppPolicy
     * from the Public Server.
     */
    maID: "your.app.id",

    /**
     * networkType
     * Which type of networking approach for connecting with the AppBuilder
     * server data.
     *
     * Options: [ rest, relay ]
     *  "rest" : directly connect to the AppBuilder Server using their
     *           Restful api.
     *  "relay" : communicate via an encrypted relay server
     */
    networkType: "relay",

    /**
     * relayPollFrequencyNormal
     * the amount of time to wait between polling requests when we are NOT
     * expecting any data. (like when we have not made any requests)
     */
    relayPollFrequencyNormal: 5000, // 1000 * 60 * 5,  // in ms:  5 minutes

    /**
     * relayPollFrequencyExpecting
     * the amount of time to wait between polling requests when we ARE
     * expecting a response data. (like after a request)
     */
    relayPollFrequencyExpecting: 1000, // 1000 * 5,  // in ms:  5 seconds

    /**
     * routes
     * specific routes for certain services on our AppBuilder Server.
     */
    routes: {
        /**
         * feedback: the route that processes our AppFeedback transactions.
         */
        feedback: "/opstool-sdc/SDCReports/feedback"
    },

    /**
     * urlCoreServer
     * the complete connection url to access our Core Server
     */
    urlCoreServer: "http://localhost:1337",

    /**
     * urlPublic Server
     * the complete connection url to access the Public Server.
     */
    urlRelayServer: "http://localhost:1337"
};
