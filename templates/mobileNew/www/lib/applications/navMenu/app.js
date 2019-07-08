/**
 * This is the ABMobileApp subclass for the Coaching ABApplication
 */
"use strict";

// import the ABApplicationConfig object
// this object manages properly initialized ABApplication objects
// import ABApplicationConfig from "../../../AppBuilder/ABApplicationConfig";

//import the applications
// import ABAppController from '../../AppBuilder/ABAppController';
import EventEmitter from "eventemitter2";
import Routes from "./routes.js";

export default class App extends EventEmitter {
    /**
     */
    constructor() {
        super();

        this.id = "NavMenu";
        this.initTimeout = 1000; // increase timeout

        // initialize with our local Application information:
        this.routes = Routes;

        // The live ABApplication & Objects
        // this.application = ABApplicationConfig.getApplication("SDC_New");

        // // The datacollections this App depends on
        // this.datacollections = [];
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
