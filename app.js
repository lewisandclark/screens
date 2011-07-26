(function() {
  var app, env;
  env = require(__dirname + '/config/env');
  app = require(__dirname + '/config/app');
  app.get('/', function(req, res) {
    return res.render('index', {
      title: 'Lewis & Clark Campus Display System',
      digital_ts: '10029244356'
    });
  });
  app.listen(env.port);
}).call(this);
