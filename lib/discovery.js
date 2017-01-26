"use strict"

module.exports = function (discoveryInterface, config, cb) {
    var context = this;
    var serverInfo = null;

    if(!cb){
        cb = function(err, actions){}
    }

    var id = context.events.on("up", function(info){
        serverInfo = info;
    })

    discoveryInterface(context, config, function(err, actions){
        if(err){
            console.log(err)
            return cb(err)
        }

        var startupTimeout = 0;

        var intervalId = setInterval(function(){
            if(serverInfo !== null){
                clearInterval(intervalId);
                actions.announce(serverInfo)
            }
            startupTimeout += 1000;
            if(startupTimeout === (config.startupTimeout || 5000)){
                console.log(`warning - server hasn't emitted 'up' event in ${startupTimeout}ms. Discovery is waiting. Did you forget the callback to a bootstrap event such as 'init', 'postInit' or 'start'?`)
            }
        }, 1000)

        context.events.on("shutdown", function(type, next){
            console.log("listening discovery shutdown")
            actions.remove()
            next()
        })

        context.events.on("announce", function(){
            // console.log("Announced")
        })

        context.events.on("connection", function(service){
            console.log(`${service.name} ${service.id.slice(0,8)} connected at ${service.info.protocol}://${service.info.host}:${service.info.port}`)
        })

        context.events.on("disconnect", function(service){
            console.log(`${service.name} ${service.id.slice(0,8)} disconnected`)
        })

        context.serviceRequest = require(__dirname + "/serviceRequest.js").bind(actions)
        context.serviceConnections = actions.services;
        cb(null, actions);
    });

}