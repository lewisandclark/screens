(function() {
  var Dashboard, env, events;
  events = require('events');
  env = require(__dirname + '/../config/env');
  Dashboard = (function() {
    function Dashboard() {
      var db;
      this.error = require(__dirname + '/error');
      db = require(__dirname + '/db');
      this.db = new db;
    }
    Dashboard['prototype'] = new events.EventEmitter;
    Dashboard.prototype.capture = function(data) {
      return this.db.add_to_sorted_set("impressions:" + data['key'], (new Date()).getTime(), JSON.stringify(data['screen']));
    };
    return Dashboard;
  })();
  module.exports = Dashboard;
}).call(this);
