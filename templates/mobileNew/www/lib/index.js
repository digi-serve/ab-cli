// index.js
// This is the initial bootstrap file for our Application

import initMissingFunctionality from "./init/initMissingFunctionality";
import initBootupTimeout from "./init/initBootupTimeout";
import initDefaultPages from "./init/initDefaultPages";

/*
 * Prepare Missing Functionality
 */
initMissingFunctionality
    .init()
    .then(() => {
        // you can pass in the # milliseconds for the timeout:
        // the default is 10s -> 10000 ms.
        return initBootupTimeout.init(/*10000*/);
    })
    // Put the remaining bootstrap steps between here and // .clear()
    .then(() => {
        return initDefaultPages.init();
    })
    .then(() => {
        return initBootupTimeout.clear();
    })
    .then(() => {
        console.log("bootstrap complete");
    });
