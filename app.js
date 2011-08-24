(function() {
  var app, appSSL, env, helpers, io, url;
  url = require('url');
  env = require(__dirname + '/config/env');
  app = require(__dirname + '/config/app');
  appSSL = require(__dirname + '/config/appSSL');
  io = require('socket.io').listen(app);
  helpers = {
    request: require(__dirname + '/helpers/request'),
    filter: require(__dirname + '/helpers/filter'),
    retrieve: require(__dirname + '/helpers/retrieve'),
    dashboard: require(__dirname + '/helpers/dashboard')
  };
  app.get('/', function(req, res) {
    if ((helpers.request.is_screen(req) && env.system_is_live) || helpers.request.is_test_screen(req)) {
      return res.render('signage/index.jade', {
        layout: 'layouts/signage.jade',
        locals: {
          title: 'Lewis & Clark Campus Display System',
          digital_ts: '10029244356'
        }
      });
    } else {
      return res.render('static/promo.jade', {
        layout: 'layouts/simple.jade',
        locals: {
          title: 'Lewis & Clark Campus Display System',
          buffer_size: env.buffer_size
        }
      });
    }
  });
  app.get('/reload', function(req, res) {
    io.sockets.emit('reload');
    return res.redirect('http://on.lclark.edu');
  });
  app.get('/speed/:value', function(req, res) {
    var seconds;
    seconds = req.params.value;
    io.sockets.emit('speed', {
      seconds: seconds
    });
    return res.redirect('http://on.lclark.edu');
  });
  app.listen(env.port);
  io.sockets.on('connection', function(socket) {
    var dashboard, retrieve;
    retrieve = new helpers.retrieve(socket);
    dashboard = new helpers.dashboard();
    socket.on('items', function(data) {
      return retrieve.get_lead_member(data['count']);
    });
    socket.on('impression', function(data) {
      return dashboard.capture(data);
    });
    return socket.on('error', function(data) {
      console.log("error from " + data['screen']['name']);
      return console.log(data['error']);
    });
  });
  appSSL.get('/', function(req, res) {
    return res.redirect('http://on.lclark.edu');
  });
  appSSL.get('/updates', function(req, res) {
    var params;
    params = url.parse(req.url, true).query;
    return res.send(params['hub.challenge'] || 'No hub.challenge present');
  });
  appSSL.post('/updates', function(req, res) {
    var filter, update, updates, _i, _len;
    if (helpers.request.is_trusted(req)) {
      try {
        updates = JSON.parse(req.body.body);
        for (_i = 0, _len = updates.length; _i < _len; _i++) {
          update = updates[_i];
          filter = new helpers.filter(io);
          filter.process(update);
        }
        return res.send('OK');
      } catch (e) {
        console.log(e);
        return res.send(e, 500);
      }
    } else {
      console.log('Failed Trust');
      return res.send('Failed Trust', 406);
    }
  });
  appSSL.listen(env.portSSL);
}).call(this);
