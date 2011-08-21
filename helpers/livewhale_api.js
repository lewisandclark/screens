(function() {
  var LiveWhaleAPI, env, events, https, livewhale_event;
  events = require('events');
  https = require('https');
  env = require(__dirname + '/../config/env');
  livewhale_event = require(__dirname + '/../models/livewhale_event');
  LiveWhaleAPI = (function() {
    function LiveWhaleAPI() {
      this.error = require(__dirname + '/error');
    }
    LiveWhaleAPI['prototype'] = new events.EventEmitter;
    LiveWhaleAPI.prototype.collect = function(type, id, child) {
      var object, options, req;
      if (type == null) {
        type = 'events';
      }
      if (child == null) {
        child = null;
      }
      if (id === null || id <= 0) {
        object.error('error', "id is not valid: " + id, 'LiveWhaleAPI.collect');
      }
      options = {
        host: env.livewhale.host,
        path: "" + env.livewhale.path + "/" + type + "/" + id + ".json"
      };
      object = this;
      req = https.get(options, function(res) {
        var data;
        data = '';
        res.on('data', function(chunk) {
          return data += chunk;
        });
        return res.on('end', function() {
          var item, parsed;
          parsed = JSON.parse(data);
          item = new livewhale_event(parsed, child);
          item.save();
          if ((object['_events'] != null) && (object['_events']['success'] != null)) {
            return object.emit('success', item);
          }
        });
      });
      req.on('error', function(e) {
        return object.error(e, 'request error', 'LiveWhaleAPI.collect.https');
      });
      return true;
    };
    return LiveWhaleAPI;
  })();
  module.exports = LiveWhaleAPI;
}).call(this);
