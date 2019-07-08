/**
 * @class ABMobileApp
 *
 * Is responsible for managing all the routes/data/templates for a given
 * application shown under an appPage.
 *
 * Is an EventEmitter.
 */
"use strict";

import ABApplicationConfig from "./ABApplicationConfig";
import EventEmitter from "eventemitter2";

import account from "../resources/Account.js";

export default class ABAppController extends EventEmitter {
    /**
     * @param {Framework7} app
     * @param {object} [options]
     */
    constructor(app, options = {}) {
        super({
            wildcard: true
        });

        this.options = options || {};

        this.id = "??";
        this.appPage = null;
        this.routes = null;

        this._status = "constructor";

        // default to using the __ContainerApp if the child doesn't override it
        this.application = ABApplicationConfig.getDefault();

        // this.f7App = app;

        this.datacollections = [];
        // keep track of which datacollections we are managing.
        // will try to initialize these when the App initializes (init()).

        this.initTimeout = 25 * 1000;
    }

    /**
     * init()
     * An App is fully initialized once all it's datacollections are
     * loaded with data.  Then this app can be displayed.
     *
     * During the initialization process, this Application emits
     * several "status" values:
     *      "platform.init"     verifying platform data stores ready
     *      "loading"           loading datacollection data
     *      "ready"             ready for operation.
     *
     * @param {app/controller/appPage} appPage
     *        the live instance of the Application Page Controller that
     *        displays this application.
     * @return {Promise}
     */
    init(appPage) {
        // save a reference to the lib/controllers/appPage.js object.
        if (appPage) {
            this.appPage = appPage;
        }

        // Emit a message if init doesn't complete within 25 seconds
        var initTimeout = setTimeout(() => {
            this.emit("init.timeout");
        }, this.initTimeout);

        return new Promise((resolve, reject) => {
            this.status = "init";

            // make sure each of our Datacollections have loaded their data:
            var allInits = [];
            this.datacollections.forEach((key) => {
                var dc = this.application.datacollectionByID(key);
                if (dc) {
                    dc.init();
                    allInits.push(dc.platformInit());
                } else {
                    console.error(
                        "Could not find data collection for key:" + key
                    );
                }
            });

            Promise.all(allInits)
                .then(() => {
                    // make sure our site user data has been properly
                    // loaded. (1st load this needs to come from server call)
                    return account.initUserData();
                })
                .then(() => {
                    this.status = "loading";

                    var allLoads = [];
                    this.datacollections.forEach((key) => {
                        var dc = this.application.datacollectionByID(key);
                        if (dc) {
                            allLoads.push(dc.loadData());
                        }
                    });

                    return Promise.all(allLoads);
                })
                .then(() => {
                    this.status = "ready";
                    // NOTE: the setter for .status emits it's value:

                    clearTimeout(initTimeout);
                    // transitional:  legacy method.
                    this.emit("dataReady");
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * isReady
     * is our data ready to work with?
     * @return {bool}
     */
    isReady() {
        return this.status == "ready";
    }

    /**
     * status
     * register our current application status state.
     * @param {string} status
     */

    get status() {
        return this._status;
    }

    set status(newStatus) {
        this._status = newStatus;
        this.emit("status", newStatus);
    }

    /**
     * clearSystemData
     * this method will clear the local storage of data, that is primarialy
     * server/system centric.  We do this before we do a reset to refresh our
     * data from the Server.
     */
    clearSystemData() {
        return Promise.resolve();
    }

    /**
     * dataCollection()
     * return the ABDataCollection referenced by the given key
     * @param {string} key the .name of the DataColleciton to return
     * @return {ABDataCollection}
     */
    dataCollection(key) {
        return this.application.datacollectionByID(key);
    }

    /**
     * listItems()
     * return an array of options for a given Object.Field
     * that is defined as a List.
     *
     * What is returned is an array of [ { id:'listItemValue', label:"display text"}]
     * that represents the valid options for the specified field.
     *
     * @param {string} objKey  either the ABObject.id or it's .name
     * @param {string} fieldKey either the ABField.id or it's .name
     * @param {string} langCode the language translation of the item to return
     * @return {array}
     */
    listItems(objKey, fieldKey, langCode = "en") {
        var results = [];

        var object = this.object(objKey);
        if (!object) return results;

        var field = object.fields((f) => {
            return f.id == fieldKey || f.columnName == fieldKey;
        })[0];
        if (!field) return results;

        field.settings.options.forEach((o) => {
            var item = {
                id: o.id,
                name: o.text
            };

            var label = o.text;
            var properLanguage = (o.translations || []).find((t) => {
                return t.language_code == langCode;
            });
            if (properLanguage) {
                label = properLanguage.text;
            }

            item.label = label;

            results.push(item);
        });

        return results;
    }

    /**
     * object()
     * return the ABDataCollection referenced by the given key
     * @param {string} key the .name of the DataColleciton to return
     * @return {ABDataCollection}
     */
    object(key) {
        return this.application.objectByID(key);
    }

    /**
     * dc()
     * initialize a DataCollection (dc) from a given id.
     *
     * this method() will create an internal property:  .data[fieldName] and
     * a method to access this data:  .get[fieldName]()
     *
     * in addition, an internal reference to the data collection is
     * maintained at dc[fieldName];
     *
     * this method populates the data from the values stored in our
     * local storage.
     *
     * @param {string} id  the uuid of the defined OBJ that contains this data
     * @param {string} fieldName the local field name to reference this data
     *                 by.
     * @return {Promise}
     */
    //     dc(id, fieldName) {

    //         var dataRef = this.refDataField(fieldName);
    //         this[dataRef] = [];

    //         var methodRef = this.refMethod(fieldName);
    //         this[methodRef] = function() {
    //             return this[dataRef];
    //         }

    //         var dcRef = this.refDC(fieldName);
    //         if (!this[dcRef]) {
    //             var dc = this.dcFind(id);
    //             if (!dc) {
    //                 console.error(' could not find DataCollection by id['+id+']');
    //                 return Promise.reject();
    //             }
    //             this[dcRef] = dc;
    //         }

    //         return new Promise((resolve, reject)=>{
    //             this[dcRef].loadDataLocal()
    //             .then((dcData) => {
    //                 this[dataRef] = dcData;
    //                 resolve();
    //             })
    //             .catch((err)=>{
    // console.error('::: .dc.loadDataLocal() error:', err);
    //                 reject(err);
    //             });
    //         })
    //     }

    /**
     * dcFind()
     * lookup a DataCollection by a given id.
     * @param {string} id the UUID of the DC to find
     * @return {ABDataCollection} or null if not found.
     */
    // dcFind(id) {
    //     // try to search all pages for the specified data collection id
    //     var pages = this.application.pages();
    //     var dc = null;
    //     pages.forEach((p)=>{
    //         if (!dc) {
    //             dc = p.dataCollections((c) => {
    //                     return c.id == id;
    //                 })[0];
    //         }
    //     })
    //     return dc;
    // }

    /**
     * dcRemote()
     * initiates a request to gather the DataCollection's data from the Server.
     *
     * @param {string} id  the uuid of the DC that contains this data
     * @param {string} fieldName the local field name to reference this data
     *                 by.
     * @return {Promise}
     */
    //     dcRemote(id, fieldName) {

    //         var dataRef = this.refDataField(fieldName);
    //         var emitRef = fieldName+'Updated';
    //         var dcRef   = this.refDC(fieldName);

    //         if (!this[dcRef]) {
    //             var dc = this.dcFind(id);
    //             if (!dc) {
    //                 console.error(' could not find DataCollection by id['+id+']');
    //                 return Promise.reject();
    //             }
    //             this[dcRef] = dc;
    //         }

    //         return new Promise((resolve, reject) =>{
    //             this[dcRef].loadData()
    //             .catch((err)=>{
    // console.error('::: .dcRemote().loadData() error:', err);
    //                 reject(err);
    //             });    // kicks off a Relay request
    //             this[dcRef].removeAllListeners('data'); // prevent multiple
    //             this[dcRef].on('data', (dcData) => {
    //                 this[dataRef] = dcData;
    //                 this.emit(emitRef);
    //                 resolve(dcData);
    //             });
    //         });
    //     }

    /**
     * lookupData()
     * initialize a special 'lookup' data type. This type is data
     * from a table that is used for list selection type values.
     * --> there are alot of these in HRIS.
     *
     * this fn() will create an internal data:  .data[fieldName] and
     * a method to access this data:  .get[fieldName]()
     *
     * this method populates the data from the values stored in our
     * local storage.
     *
     * @param {string} id  the uuid of the defined OBJ that contains this data
     * @param {string} fieldName the local field name to reference this data
     *                 by.
     * @return {Promise}
     */
    // lookupData(id, fieldName) {
    //     var obj = this.objByID(id);

    //     var objRef = this.refObj(fieldName);
    //     if (!this[objRef]) this[objRef] = obj;

    //     var dataRef = this.refDataField(fieldName);
    //     this[dataRef] = [];

    //     var methodRef = this.refMethod(fieldName);
    //     this[methodRef] = function() {
    //         return this[dataRef];
    //     }

    //     var methodRefreshRef = this.refMethodRefresh(fieldName);
    //     this[methodRefreshRef] = function() {
    //         return this.lookupData(id, fieldName);
    //     }

    //     return new Promise((resolve, reject)=>{
    //         obj.model().local().findAll().then((listEntries)=>{
    //             this[dataRef] = listEntries || [];
    //             resolve();
    //         })
    //     })
    // }

    /**
     * lookupDataRemote()
     * initiates a request to gather the lookup data from the Server.
     *
     * @param {string} id  the uuid of the defined OBJ that contains this data
     * @param {string} fieldName the local field name to reference this data
     *                 by.
     * @return {Promise}
     */
    // lookupDataRemote(id, fieldName, shouldOverwriteLocal) {
    //     return new Promise((resolve, reject) => {
    //         var obj = this.objByID(id);

    //         var dataRef = this.refDataField(fieldName);

    //         // send our Relay request for our data
    //         obj.model().relay().findAll({where:{}, populate:false});

    //         // .relay() doesn't return data immediately.
    //         // so listen for our 'data' event and respond with that
    //         obj.on('data', (allEntries)=>{
    //             this[dataRef] = allEntries || [];

    //             if (shouldOverwriteLocal) {
    //                 obj.model().local().saveLocalData(allEntries)
    //                 .then(()=>{
    //                     resolve();
    //                 })
    //             } else {
    //                 resolve();
    //             }

    //         })
    //     });
    // }

    /**
     * objByID()
     * return an ABObject from a given id.
     * @param {string} id
     * @return {ABObject} or {undefined} if not found.
     */
    objByID(id) {
        return this.application.objects((o) => {
            return o.id == id;
        })[0];
    }

    /**
     * Takes an array produced by lookupData() and indexes the data labels
     * according to the primary key. If it has multilingual labels, they will
     * be further indexed by language_code.
     *
     * @param {array} dataArray
     *  [
     *      { <primary_key>, <string label>, ... },
     *      { ... },
     *      ...
     *  ]
     *      OR
     *  [
     *      { <primary_key>, translations: [ ... ], ... },
     *      { ... },
     *      ...
     *  ]
     * @param {string} [primaryKeyField]
     *      Optional. If not specified, the primary key field will be guessed
     *      automatically from fields named "id" or ending in "id".
     * @param {string} [labelField]
     *      Optional. If not specified, the label field will be guessed
     *      automatically from field names ending in "label".
     * @return {object}
     *  {
     *      <primary_key>: <string label>,
     *      ...
     *  }
     *      OR
     *  {
     *      <primary_key>: { <language_code>: <string label>, ... },
     *      ...
     *  }
     */
    indexLookupData(dataArray, primaryKeyField = null, labelField = null) {
        var results = {};

        if (dataArray[0]) {
            // Examine first item for field names
            var item = dataArray[0];
            var fieldNames = Object.keys(item);

            // Best guess at what the primary key field is
            if (!primaryKeyField) {
                if (item.id) {
                    // Fieldname is literally "id"
                    primaryKeyField = "id";
                } else {
                    // First fieldname that ends in "id"
                    var keyFields = fieldNames.find((f) => {
                        return f.match(/id$/);
                    });
                    primaryKeyField = keyFields[0];
                }
            }

            if (!labelField && item.translations && item.translations[0]) {
                // Multilingual labels
                for (var f in item.translations[0]) {
                    labelField = f;
                    if (f.match(/label$/)) {
                        labelField = f;
                        break;
                    }
                }
            } else if (!labelField) {
                // Simple labels
                /* eslint-disable-next-line no-redeclare */
                for (var f in item) {
                    labelField = f;
                    if (f.match(/label$/)) {
                        labelField = f;
                        break;
                    }
                }
            }

            // Convert to indexed array
            dataArray.forEach((item) => {
                var label = item[labelField];

                // For multilingual, index the translations
                if (Array.isArray(item.translations)) {
                    label = {};
                    item.translations.forEach((trans) => {
                        label[trans.language_code] = trans[labelField];
                    });
                }

                results[item[primaryKeyField]] = label;
            });
        }

        return results;
    }

    /**
     * reset()
     * implements a hard reset on the App.  We reset our status to
     * uninitialized state, and the perform an init()
     * @return {Promise}
     */
    reset() {
        return AB.Platform.storage
            .set(this.refStatusKey(), null)
            .then(() => {
                // make sure each of our Datacollections have resset their
                // data:
                var allResets = [];
                this.datacollections.forEach((key) => {
                    var dc = this.application.datacollectionByID(key);
                    if (dc) {
                        allResets.push(dc.platformReset());
                    }
                });

                return Promise.all(allResets);
            })
            .then(() => {
                return this.init();
            });
    }

    /**
     * valueLoad()
     * load a value from local storage.
     *
     * This routine will create a local property for the value as well as
     * an accessor method.
     *
     * @param {string} fieldName the local field name to reference this data
     *                 by.
     */
    // valueLoad(fieldName) {
    //     var dataRef = this.refDataField(fieldName);
    //     var storageRef = this.refStorageField(fieldName);

    //     var methodRef = this.refMethod(fieldName);
    //     this[methodRef] = function() {
    //         return this[dataRef];
    //     }

    //     return AB.Platform.storage.get(storageRef)
    //     .then((value)=>{
    //         this[dataRef] = value;
    //     });
    // }

    /**
     * valueSave()
     * save a value to local storage.
     *
     * If a value is provided, then that value is set to the local property
     * as well as stored in local storage.
     *
     * otherwise, the current property values is saved to local storage.
     *
     * @param {string} fieldName the local field name to reference this data
     *                 by.
     */
    // valueSave(fieldName, value) {
    //     var dataRef = this.refDataField(fieldName);

    //     // if no value was given, assume a save on the curent value.
    //     if (typeof value === 'undefined') {
    //         value = this[dataRef];
    //     }
    //     this[dataRef] = value;

    //     var storageRef = this.refStorageField(fieldName);
    //     return AB.Platform.storage.set(storageRef, value);
    // }

    // refDataField(fieldName) {
    //     return 'data'+fieldName;
    // }
    // refDC(fieldName) {
    //     return 'dc'+fieldName;
    // }
    // refMarkers() {
    //     return this.id+'-Markers';
    // }
    // refMethod(fieldName) {
    //     return 'get'+fieldName;
    // }
    // refMethodRefresh(fieldName) {
    //     return 'refresh'+fieldName;
    // }
    // refObj(fieldName) {
    //     return 'obj'+fieldName;
    // }
    refStatusKey() {
        return this.id + "-init-status";
    }
    // refStorageField(fieldName) {
    //     return this.id+'-'+fieldName;
    // }

    // hasMarker( marker ) {
    //     return Promise.resolve()
    //     .then(()=>{
    //         if (this._markers[marker]) {
    //             return true;
    //         }

    //         return false;
    //     })
    // }

    // setMarker( marker ) {
    //     this._markers[marker] = '1';
    //     return AB.Platform.storage.set(this.refMarkers(), this._markers);
    // }

    /**
     * Shortcut for this.$element.find()
     */
    $(pattern) {
        var $element;
        if (this.id) {
            $element = $("#" + this.id);
        } else {
            $element = $(document.body);
        }
        return $element.find(pattern);
    }
}
