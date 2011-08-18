(function() {
  var Data, env, events, redis;
  events = require('events');
  redis = require('redis');
  env = require(__dirname + '/../config/env');
  Data = (function() {
    function Data() {
      this.error = require(__dirname + '/error');
      this.client = redis.createClient(env.ports.redis, env.hosts.redis);
    }
    Data['prototype'] = new events.EventEmitter;
    Data.prototype.content_key = function(type, id) {
      if (type == null) {
        type = 'events';
      }
      if (id != null) {
        return "" + type + ":" + id;
      }
      return this.error('key failure', "unable to create key from " + type + " and " + id, 'Data.content_key');
    };
    Data.prototype.push_to_channel = function() {
      return true;
    };
    Data.prototype.remove_from_list = function() {
      return true;
    };
    Data.prototype.save = function(data) {
      var key;
      try {
        key = this.content_key(data['type'], data['id']);
        this.client.set(key, JSON.stringify(data));
        return this.emit('success', data);
      } catch (e) {
        return this.error(e, "could not set " + data['type'] + " " + data['id'], 'Data.save');
      }
    };
    Data.prototype["delete"] = function(type, id) {
      var key;
      if (type == null) {
        type = 'events';
      }
      try {
        key = this.content_key(data['type'], data['id']);
        this.client.del(key);
        return this.emit('success', type, id);
      } catch (e) {
        return this.error(e, "could not delete " + type + " " + id, 'Data.delete');
      }
    };
    return Data;
  })();
  module.exports = Data;
}).call(this);
