(function() {
  var Filter, env, events, https;
  events = require('events');
  https = require('https');
  env = require(__dirname + '/../config/env');
  Filter = (function() {
    function Filter() {
      this.error = require(__dirname + '/error');
      this.livewhale = require(__dirname + '/livewhale');
      this.data = require(__dirname + '/data');
    }
    Filter['prototype'] = new events.EventEmitter;
    Filter.prototype.process = function(update) {
      var data, livewhale, object;
      if (update == null) {
        update = {};
      }
      object = this;
      if (update['is_deleted']) {
        data = new this.data;
        data.on('success', function(type, id) {
          if (type == null) {
            type = 'events';
          }
          if (id == null) {
            id = 0;
          }
          return console.log("" + type + " " + id + " was deleted");
        });
        data["delete"](update['object'], update['object_id']);
      } else {
        livewhale = new this.livewhale_api;
        livewhale.on('success', function(parsed) {
          data = new object.data;
          data.on('success', function(stored_data) {
            console.log("SAVED");
            return console.log(stored_data);
          });
          return data.save(parsed);
        });
        livewhale.collect(update['object'], update['object_id']);
      }
      return true;
    };
    return Filter;
  })();
  module.exports = Filter;
}).call(this);
