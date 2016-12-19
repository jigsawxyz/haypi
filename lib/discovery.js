"use strict"

module.exports = function (discoveryInterface, config) {
    var context = this;
    let actions = discoveryInterface(context, config);

    var id = context.events.on("up", function(serverInfo){
        actions.announce(serverInfo)
    })

    context.events.on("shutdown", function(type){
        actions.remove()
    })

    context.events.on("announce", function(){
        console.log("Announced")
    })

    context.events.on("connection", function(service){
        console.log(`${service.name} ${service.id.slice(0,8)} connected at ${service.info.protocol}://${service.info.host}:${service.info.port}`)
    })

    context.events.on("disconnect", function(service){
        console.log(`${service.name} ${service.id.slice(0,8)} disconnected`)
    })

    context.serviceRequest = require(__dirname + "/serviceRequest.js").bind(actions)
    context.serviceConnections = actions.services;
}