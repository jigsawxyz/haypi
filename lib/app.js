var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var path = require('path');
var _ = require('lodash');

module.exports = function (context, info) {
  var app = express();
  var opts = _.pick(info, ["limit"])
  app.use(logger('dev'));
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
