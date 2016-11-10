var path = require("path");

var context = {
    controllers: {},
    //environment variables
    env: {},
    helpers: require(path.normalize(__dirname + "/lib/helpers.js")),
    //environment mode, development, staging, production...
    mode: "",
    //globals setter and getter
    globals: require(path.normalize(__dirname + "/lib/globals.js")),
    //middleware
    middleware: {},
    //root uri for all routes in schema
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

//service discovery interface
context.discovery = function(interface, config) { return require(path.normalize(__dirname + "/lib/discovery.js")).call(context, interface, config) }

 //init function
context.start = function(info){ require(path.normalize(__dirname + "/lib/init.js")).call(context, info) }

module.exports = context;
