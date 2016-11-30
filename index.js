'use strict';
let path = require('path');
let _ = require('lodash')
let context = {
    controllers: {},
    db: {},
    env: {}, // environment variables
    errors: {},
    helpers: require('./lib/helpers'),
    mode: '', // environment mode, development, staging, production...
    globals: require('./lib/globals'), // globals setter and getter
    logger: require('./lib/logger'),
    middleware: {},
    //i dont know what this is
    plugins: [],
    rootUri: '', // root uri for all routes
    schemas: {},
}
// event callbacks
context.events = require('./lib/events').call(context);

// service discovery serviceInterface
context.discovery = function (serviceInterface, config) {
    return require('./lib/discovery').call(context, serviceInterface, config)
}

// start server fn
context.start = function (info) { require('./lib/init').call(context, info) }

module.exports = context;
module.exports.app = require('./lib/app.js');

module.exports.buildApp = (params) => {

    _.assign(context, params)
    if (!context.name) {
        throw new Error("Please specify a name for the app ex. `name:'My App'`");
    }
    if (!context.mode) {
        throw new Error("No mode specified ex. `mode: development`");
    }

    var nconf = require("nconf").argv().env({ separator: '__' }).defaults(context.env()[context.mode]);
    context.env = nconf;


}
