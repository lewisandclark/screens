(function() {
  var Filter, app, env, events, io, livewhale_event;
  events = require('events');
  env = require(__dirname + '/../config/env');
  app = require(__dirname + '/../config/app');
  io = require('socket.io').listen(app);
  livewhale_event = require(__dirname + '/../models/livewhale_event');
  Filter = (function() {
    function Filter() {
      this.error = require(__dirname + '/error');
      this.livewhale_api = require(__dirname + '/livewhale_api');
    }
    Filter['prototype'] = new events.EventEmitter;
    Filter.prototype.process = function(update) {
      var livewhale_api, object;
      if (update == null) {
        update = {};
      }
      object = this;
      if (update['is_deleted'] || update['is_removed']) {
        livewhale_event["delete"](update['object_id']);
      } else {
        livewhale_api = new this.livewhale_api;
        livewhale_api.collect(update['object'], update['object_id']);
        this.update({
          something: 'test'
        });
      }
      return true;
    };
    Filter.prototype.update = function(item) {
      return io.sockets.emit('update', {
        item: item
      });
    };
    Filter.prototype.remove = function(type, id) {
      if (type == null) {
        type = 'events';
      }
    };
    return Filter;
  })();
  module.exports = Filter;
}).call(this);
