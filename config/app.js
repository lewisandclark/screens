(function() {
  var app, browserify, env, express, fs;
  express = require('express');
  fs = require('fs');
  env = require(__dirname + '/env');
  browserify = require('browserify');
  app = express.createServer();
  app.configure(function() {
    app.set('host', 'on.lclark.edu');
    app.set('views', __dirname + '/../views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(app.router);
    app.use(express.static(__dirname + '/../public'));
    return app.use(browserify({
      mount: '/browserify.js',
      require: __dirname + '/../helpers/string'
    }));
  });
  app.configure('development', function() {
    app.set('port', env.ports.dev);
    app.use(express.logger());
    return app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });
  app.configure('production', function() {
    app.set('port', env.ports.pro);
    return app.use(express.errorHandler());
  });
  module.exports = app;
}).call(this);
