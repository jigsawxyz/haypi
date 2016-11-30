var EventEmitter = require("events");

module.exports = function(){
    var context = this;
    var _emitter = new EventEmitter();
    return {
        on: function(event, cb){
            _emitter.on(event, cb.bind(context));
        },
        emit: function(event, data){
            _emitter.emit(event, data);
        },
        up: function(serviceInfo){
            if(_emitter.listenerCount("up") > 0){
                _emitter.emit("up", serviceInfo);
            }
        },
        start: function(server, next){
            if(_emitter.listenerCount("start") > 0){
                _emitter.emit("start", server, next);
            } else {
                next();
            }
        },
        init: function(app, next){
            if(_emitter.listenerCount("init") > 0){
                _emitter.emit("init", app, next);
            } else {
                next();
            }
        },
        postInit: function(app, next){
            if(_emitter.listenerCount("postInit") > 0){
                _emitter.emit("postInit", app, next);
            } else {
                next();
            }
        },
        request: function(req, res, next){
            if(_emitter.listenerCount("request") > 0){
                _emitter.emit("request", req, res, next);
            } else {
                next();
            }
        },
        response: function(req, res){
            if(_emitter.listenerCount("response") > 0){
                _emitter.emit("response", req, res);
            }
        },
        shutdown: function(type){
            if(_emitter.listenerCount("shutdown") > 0){
                _emitter.emit("shutdown", type);
            }
        },
        validationError: function(req, res, errors, next){
            if(_emitter.listenerCount("validationError") > 0){
                _emitter.emit("validationError", req, res, errors, next);
            } else {
                return res.badRequest(errors, "Validation Error");
            }
        }
    }
}
