/*
 * Network.js
 * A network manager for interfacing with our AppBuilder server.
 */
import AB from "../AB/AB";
import EventEmitter from "eventemitter2";

// pages that use :
// /lib/pages/app/appPage.js

class Network extends EventEmitter {
    constructor() {
        super();
    }

    init(account) {
        // account is optional.
        return AB.Comm.Relay.init(account);
    }

    queueFlush() {
        return AB.Comm.Relay.queueFlush();
    }

    getTokens() {
        // called in appPage.js : openRelayLoader()
        return AB.Comm.Relay.getTokens();
    }
}

var network = new Network();
export default network;
