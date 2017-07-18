var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var path = require('path');
var _ = require('lodash');

logger.token("time", function(req, res){
  return "\x1b[47m\x1b[30m" + new Date().toUTCString() + "\x1b[40m\x1b[37m"
})

logger.token("status", function(req, res){
  var statusString;
  if(res.statusCode < 300){
    statusString = "\x1b[40m\x1b[32m" + res.statusCode;
  } else if(res.statusCode < 400){
    statusString = "\x1b[40m\x1b[36m" + res.statusCode;
  } else if(res.statusCode < 500){
    statusString = "\x1b[40m\x1b[33m" + res.statusCode;
  } else {
    statusString = "\x1b[40m\x1b[31m" + res.statusCode;
  }

  return statusString + "\x1b[40m\x1b[37m";
})

module.exports = function (context, info) {
  var app = express();
  var opts = _.pick(info, ["limit"])
  app.use(logger(':time :method :url :status :response-time ms - :res[content-length]'));
  app.use(bodyParser.json(opts));
  app.use(bodyParser.urlencoded({ extended: false }));

  if(context.viewEngine){
    app.set('view engine', context.viewEngine);
    app.use(express.static(context.publicDirectory));
    app.set('views', context.publicDirectory + "/views");
  }

  app.use(function(req, res, next){
    context.events.request.call(context, req, res, next);
  })

  return app;
}
