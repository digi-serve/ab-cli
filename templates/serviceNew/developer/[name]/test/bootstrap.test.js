/**
 * bootstrap.test.js
 * This file is useful when you want to execute some code before and after
 * running your tests
 *
 */

//
// Global Before() and After() routines to setup sails for all our tests:
//

/**
 * before()
 * process these BEFORE any tests are run.
 */
before(function (done) {
   // Increase the timeout for how long mocha should wait for tests to
   // complete.
   this.timeout(3000);

   // setup any testing fixtures, data

   done();
});

/**
 * after()
 * process these AFTER all tests are run.
 */
after(function (done) {
   //
   // here you can clear fixtures, close connections, etc.
   //
   done();
});
