var express = require('express');
var fs = require('fs');
var path = require('path');
var Ajv = require('ajv');
var ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
var async = require('async');
var _ = require('lodash');
var initResponses = require(path.normalize(__dirname + "/responses"));

module.exports = function(context){
    console.log("INITIALIZING ROUTES")
    var router = express.Router();
    return registerRoutes(context, router);
}

var registerRoutes = function(context, router){
    for(var key in context.routes){

        var routeInfo = {
            method: key.split(" ")[0].toLowerCase(),
            path: key.split(" ")[1]
        }

        if(typeof context.routes[key] === "string"){
                        
            var routeActions = context.routes[key].split(" ");

            var handlers = getHandlers(context, routeActions);

        } else if (context.routes[key] instanceof Array) {

            var handlers = context.routes[key];

        } else if (typeof context.routes[key] === "function"){
            var handlers = [context.routes[key]]
        }

        for(var func in handlers){
            handlers[func] = handlers[func].bind(context);
        }

        var finalTask = handlers.pop();

        router[routeInfo.method](routeInfo.path, function(req, res, next){
            var scope = this;
            initResponses.call(context, req, res);
            async.waterfall(scope.handlers.reduce(function(acc, val){ acc.push(async.apply(val, req, res)); return acc; }, []), function(err){
                if(err){
                    return;
                }
                scope.finalTask(req, res, next);
            })
        }.bind({handlers: handlers, finalTask: finalTask}));
    }
    return router;
}

var getHandlers = function(context, routeActions){
    var handlers = [];
    for(var i in routeActions){
        var data = _.get(context, routeActions[i], null);

        if(typeof data != "function"){

            //todo: smarter about validator datatype, or validator premade as function
            if(routeActions[i].split(".")[0] === "validators"){
                handlers.push(createValidator.call(context, data));
            } else {
                throw routeActions[i] + " is not a function or validator schema."
            }

        } else {
            handlers.push(data);
            
        }
    }
    return handlers;
}

var createValidator = function(validatorObj){
    var context = this;
    var schema = {
        type: "object",
        properties: {
            query: {
                type: "object",
            },
            params: {
                type: "object",
            },
            body: {
                type: "object",
            }
        }
    }
    schema.properties = _.merge(schema.properties, validatorObj);
    return doValidation.bind(context, {validate: ajv.compile(schema)})
}

var doValidation = function(validator, req, res, next){
    var context = this;
    var valid = validator.validate({
        query: req.query,
        body: req.body,
        params: req.params
    });
    if (!valid){
        context.events.validationError(req, res, validator.validate.errors, next)
    }
    else{
        next();
    }
}