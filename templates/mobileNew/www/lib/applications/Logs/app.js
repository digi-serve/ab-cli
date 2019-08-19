/**
 * This is the ABMobileApp subclass for the Coaching ABApplication
 */
"use strict";

import EventEmitter from "eventemitter2";
import Routes from "./routes.js";

export default class App extends EventEmitter {
    /**
     */
    constructor() {
        super();

        this.id = "Logs";

        // initialize with our local Application information:
        this.routes = Routes;
    }

    /**
     * init()
     * called by the platform (appPage.js) after the Storage mechanism is
     * already initialized and ready to go.
     */
    init(appPage) {
        this.appPage = appPage;
        // return super.init(appPage);
    }
}
