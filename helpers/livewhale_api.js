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
          var parsed;
          try {
            parsed = JSON.parse(data);
            if ((object['_events'] != null) && (object['_events']['success'] != null)) {
              return object.emit('success', type, parsed);
            }
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
    return LiveWhaleAPI;
  })();
  module.exports = LiveWhaleAPI;
}).call(this);
