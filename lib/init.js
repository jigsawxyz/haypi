#!/usr/bin/env node

/**
* Module dependencies.
*/

var path = require("path");
var EventEmitter = require('events');
var loadModule = require(path.normalize(__dirname + "/modules.js"));
var _ = require('lodash');

module.exports = function(info){
    var context = this;
    if(!info){
        info = {}
    }
    if(!info.name){
        throw "Service must have a name."
    }
    if(!info.protocol){
        info.protocol = "http";
    }
    if(!info.host){
        info.host = "0.0.0.0"
    }
    if(!info.port){
        info.port = 3000;
    }
    //------------------------------------------------
    console.log("STARTING UP")
    console.log("INITIALIZING CONFIG VARS")
    //------------------------------------------------
    var envConfig = context.env;
    var nconf = require("nconf").argv().env({ separator: '__' }).defaults(_.get(envConfig, context.mode, envConfig));

    //normalize paths of all directories in context

    //------------------------------------------------
    console.log("INITIALIZING GLOBALS")
    //------------------------------------------------
    var globalsHandler = context.globals;

    context.env = nconf;

    globalsHandler.set({ env: nconf });
    var app = require('./app')(context);

    //------------------------------------------------
    console.log("ON INIT")
    //------------------------------------------------
    context.events.init.call(context, app, function(){
        // catch and send 404
        var notFoundError = context.errors.notFound;
        app.use(function(req, res) {
            res.status(notFoundError.httpCode).json({
                error: {
                    code: notFoundError.httpCode,
                    type: notFoundError.type,
                    internalCode: notFoundError.internalCode,
                    message: notFoundError.message,
                },
            })
        });

        // generic server error if something bad gets through request handler
        var serverError = context.errors.server;
        app.use(function(err, req, res, next) {
            res.status(serverError.httpCode).json({
                error: {
                    code: serverError.httpCode,
                    type: serverError.type,
                    internalCode: serverError.internalCode,
                    message: serverError.message,
                },
            })
        });

        var debug = require('debug')('express-template:server');
        var http = require('http');

        var startup = context.events.start.bind(context);
        var afterStart = context.events.up.bind(context);
        var shutdown = context.events.shutdown.bind(context);

        /**
        * Get port from environment and store in Express.
        */

        info.port = normalizePort(info.port);

        app.set('port', info.port);

        /**
        * Create HTTP server.
        */

        var server = http.createServer(app);

        /**
        * Listen on provided port, on all network interfaces.
        */

        startup(function(err){
            if(err){
                throw err;
            }
            startServer(server, info, {
                afterStart: afterStart,
                shutdown: shutdown
            });
        })
    })
}

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

function startServer(server, info, callbacks){
    var serverStatus = new EventEmitter();

    serverStatus.on("start", function(){

        server.listen(info.port, info.host);
        server.on('error', onError);
        server.on('listening', onListening);

    })

    serverStatus.on("started", function(bind){

        onClose(callbacks.shutdown)

        callbacks.afterStart({
            protocol: info.protocol,
            host: server.address().address,
            port: bind,
            name: info.name
        })
    })

    function onError(error) {

        if (error.syscall !== 'listen') {
            throw error;
        }

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
            console.error("PORT" + ' requires elevated privileges');
            process.exit(1);
            break;
            case 'EADDRINUSE':
            console.error("Port " + info.port + ' is already in use');
            info.port += 1;
            server.removeListener("error", onError);
            server.removeListener("listening", onListening);
            serverStatus.emit("start");
            break;
            default:
            throw error;
        }
    }

    function onListening() {
        var addr = server.address();
        var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
        console.log('Listening on ' + bind);
        serverStatus.emit("started", addr.port);
    }

    function onClose(cb){
        process.on("exit", function(type){
            cb(type)
        })
        process.on("SIGTERM", function(){
            process.exit("SIGTERM");
        })
        process.on("SIGINT", function(){
            process.exit("SIGINT");
        })
    }

    serverStatus.emit("start");
}
