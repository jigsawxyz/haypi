var EventEmitter = require("events");
var crypto = require("crypto");

module.exports = function(){
    var context = this;
    var _emitter = new EventEmitter();
    var storedEvents = {};
    return {
        on: function(event, cb){
            var id = generateRandomId(event, cb);
            storedEvents[id] = cb;
            _emitter.on(event, cb);
            return id;
        },
        once: function(event, cb){
            _emitter.once(event, cb);
            return this;
        },
        emit: function(event, data){
            _emitter.emit(event, data);
            return this;
        },
        removeListener: function(event, action){
            if(typeof action === "function"){
                _emitter.removeListener(event, action);
            } else if(typeof action === "string"){
                if(typeof storedEvents[action] === "function"){
                    _emitter.removeListener(event, storedEvents[action])
                    delete storedEvents[action]
                }
            }
            return this;
        },
        removeAllListeners: function(event){
            _emitter.removeAllListeners(event)
            return this;
        },
        up: function(serviceInfo){
            if(_emitter.listenerCount("up") > 0){
                _emitter.emit("up", serviceInfo);
            }
        },
        start: function(server, next){
            var cbCount = 0;
            if(_emitter.listenerCount("start") > 0){
                _emitter.emit("start", server, function(){
                    cbCount += 1;
                    if(cbCount >= _emitter.listenerCount("start")){
                        return next()
                    }
                });
            } else {
                next();
            }
        },
        init: function(app, next){
            var cbCount = 0;
            if(_emitter.listenerCount("init") > 0){
                _emitter.emit("init", app, function(){
                    cbCount += 1;
                    if(cbCount >= _emitter.listenerCount("init")){
                        return next()
                    }
                })
            } else {
                next();
            }
        },
        postInit: function(app, next){
            var cbCount = 0;
            if(_emitter.listenerCount("postInit") > 0){
                _emitter.emit("postInit", app, function(){
                    cbCount += 1;
                    if(cbCount >= _emitter.listenerCount("postInit")){
                        return next()
                    }
                })
            } else {
                next();
            }
        },
        request: function(req, res, next){
            var cbCount = 0;
            if(_emitter.listenerCount("request") > 0){
                _emitter.emit("request", req, res, function(){
                    cbCount += 1;
                    if(cbCount >= _emitter.listenerCount("request")){
                        return next()
                    }
                });

            } else {
                next();
            }
        },
        response: function(req, res){
            if(_emitter.listenerCount("response") > 0){
                _emitter.emit("response", req, res);
            }
        },
        shutdown: function(type, next){
            var cbCount = 0;
            if(_emitter.listenerCount("shutdown") > 0){
                _emitter.emit("shutdown", type, function(){
                    cbCount += 1;
                    if(cbCount >= _emitter.listenerCount("shutdown")){
                        next()
                    }
                });
            } else {
                next()
            }
        }
    }
}

function generateRandomId(eventname, func){

    var array = [Math.random().toString(), eventname, func.toString(), Date.now().toString()];
    
    array.reduce(function(acc, val, i){
        var newIndex = Math.floor(Math.random() * array.length);
        array[i] = array[newIndex];
        array[newIndex] = val;
    })

    return crypto.createHash('sha256')
    .update(array[0])
    .update(array[1])
    .update(array[2])
    .update(array[3])
    .digest("hex");
}
