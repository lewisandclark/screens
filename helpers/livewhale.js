(function() {
  var LiveWhaleAPI, env, events, https;
  events = require('events');
  https = require('https');
  env = require(__dirname + '/../config/env');
  LiveWhaleAPI = (function() {
    function LiveWhaleAPI() {
      this.error = require(__dirname + '/error');
    }
    LiveWhaleAPI['prototype'] = new events.EventEmitter;
    LiveWhaleAPI.prototype.collect = function(type, id) {
      var object, options, req;
      if (type == null) {
        type = 'events';
      }
      if (id === null || id <= 0) {
        object.error('error', "id is not valid: " + id, 'LiveWhaleAPI.collect');
      }
      options = {
        host: env.hosts.livewhale,
        path: "" + env.livewhale_api_path + "/" + type + "/" + id + ".json"
      };
      object = this;
      req = https.get(options, function(res) {
        var data;
        data = '';
        res.on('data', function(chunk) {
          return data += chunk;
        });
        return res.on('end', function() {
          var parsed;
          try {
            parsed = JSON.parse(data);
            parsed['type'] = type;
            return object.emit('success', parsed);
          } catch (e) {
            return object.error(e, 'parse error', 'LiveWhaleAPI.collect.https');
          }
        });
      });
      req.on('error', function(e) {
        return object.error(e, 'request error', 'LiveWhaleAPI.collect.https');
      });
      return true;
    };
    LiveWhaleAPI.prototype.is_live = function(update) {
      if (update['status'] === 1) {
        return true;
      }
      if (update['type'] === 'news' && update['golive'] > new Date() && update['expiration'] > update['golive']) {
        return true;
      }
      return false;
    };
    LiveWhaleAPI.prototype.has_parent = function(update) {
      if (update['parent_id'] != null) {
        return true;
      }
      return false;
    };
    return LiveWhaleAPI;
  })();
  module.exports = LiveWhaleAPI;
}).call(this);
