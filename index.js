'use strict';
var path = require("path");
var _ = require('lodash')
var context = {
    controllers: {},
    dbs: {}, // NOTE must be set before controllers
    //environment variables
    env: {},
    errors: require(path.normalize(__dirname + "/lib/errors.js")),
    helpers: require(path.normalize(__dirname + "/lib/helpers.js")),
    //environment mode, development, staging, production...
    mode: "",
    //globals setter and getter
    globals: require(path.normalize(__dirname + "/lib/globals.js")),
    logger: require(path.normalize(__dirname + "/lib/logger.js")),
    //middleware
    middleware: {},
    //root uri for all routes in schema
    requestHandler: require(path.normalize(__dirname + "/lib/requestHandler.js")),
    rootUri: '',
    //routes declaration
    routes: {},
    schemas: {},
    //validators
    validators: {},
    //public
    publicDirectory: "",
    //view engine
    viewEngine: null,
}

//event callbacks
context.events = require(path.normalize(__dirname + "/lib/events.js")).call(context);

//service discovery serviceInterface
context.discovery = function (serviceInterface, config) {
    return require(path.normalize(__dirname + "/lib/discovery.js")).call(context, serviceInterface, config)
}

 //init function
context.start = function (info) { require(path.normalize(__dirname + "/lib/init.js")).call(context, info) }

module.exports = context;
