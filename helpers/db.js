(function() {
  var Data, env, events, redis;
  events = require('events');
  redis = require('redis');
  env = require(__dirname + '/../config/env');
  Data = (function() {
    function Data() {
      this.error = require(__dirname + '/error');
      this.client = redis.createClient(env.redis.port, env.redis.host);
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
    Data.prototype.exists = function(type, id) {
      var key, object;
      if (type == null) {
        type = 'events';
      }
      object = this;
      try {
        key = this.content_key(type, id);
        return this.client.exists(key, function(e, replies) {
          if (e != null) {
            object.error(e, "redis unable to test existence of " + key, 'Data.exists.client');
            return object.quit();
          } else {
            if ((object['_events'] != null) && (object['_events']['success'] != null)) {
              object.emit('success', replies === 1 ? true : false);
            }
            return object.quit();
          }
        });
      } catch (e) {
        return this.error(e, "could not test existence of " + type + " " + id, 'Data.exists');
      }
    };
    Data.prototype.get = function(type, id) {
      var key, object;
      if (type == null) {
        type = 'events';
      }
      object = this;
      try {
        key = this.content_key(type, id);
        return this.client.get(key, function(e, replies) {
          if (e != null) {
            object.error(e, "redis unable to get " + key, 'Data.get.client');
            return object.quit();
          } else {
            if ((object['_events'] != null) && (object['_events']['success'] != null)) {
              object.emit('success', replies);
            }
            return object.quit();
          }
        });
      } catch (e) {
        return this.error(e, "could not get " + type + " " + id, 'Data.get');
      }
    };
    Data.prototype.set = function(type, data) {
      var key, object;
      if (type == null) {
        type = 'events';
      }
      object = this;
      try {
        key = this.content_key(type, data['id']);
        return this.client.set(key, JSON.stringify(data), function(e, replies) {
          var global_list;
          if (e != null) {
            object.error(e, "redis unable to set " + key, 'Data.set.client');
            return object.quit();
          } else {
            if ((object['_events'] != null) && (object['_events']['success'] != null)) {
              object.emit('success', replies);
            }
            object.quit();
            global_list = new Data();
            return global_list.add_to_set("global:keys", key);
          }
        });
      } catch (e) {
        return this.error(e, "could not set " + type + " " + data['id'], 'Data.set');
      }
    };
    Data.prototype.del = function(type, id) {
      var key, object;
      if (type == null) {
        type = 'events';
      }
      object = this;
      try {
        key = this.content_key(type, id);
        return this.client.del(key, function(e, replies) {
          if (e != null) {
            object.error(e, "redis unable to delete " + key, 'Data.del.client');
            return object.quit();
          } else {
            if ((object['_events'] != null) && (object['_events']['success'] != null)) {
              object.emit('success', replies);
            }
            return object.quit();
          }
        });
      } catch (e) {
        return this.error(e, "could not delete " + type + " " + id, 'Data.del');
      }
    };
    Data.prototype.add_to_sorted_set = function(key, rank, value) {
      var object;
      object = this;
      try {
        return this.client.zadd(key, rank, value, function(e, replies) {
          if (e != null) {
            object.error(e, "redis unable to add " + value + " of " + rank + " to sorted set " + key, 'Data.zadd.client');
            return object.quit();
          } else {
            if ((object['_events'] != null) && (object['_events']['success'] != null)) {
              object.emit('success', replies, key);
            }
            return object.quit();
          }
        });
      } catch (e) {
        return this.error(e, "could not add " + value + " of " + rank + " to sorted set " + key, 'Data.zadd');
      }
    };
    Data.prototype.add_to_set = function(key, value) {
      var object;
      object = this;
      try {
        return this.client.sadd(key, value, function(e, replies) {
          if (e != null) {
            object.error(e, "redis unable to add " + value + " to set " + key, 'Data.sadd.client');
            return object.quit();
          } else {
            if ((object['_events'] != null) && (object['_events']['success'] != null)) {
              object.emit('success', replies, key);
            }
            return object.quit();
          }
        });
      } catch (e) {
        return this.error(e, "could not add " + value + " to set " + key, 'Data.sadd');
      }
    };
    Data.prototype.publish = function(channel, value) {
      var object;
      object = this;
      try {
        return this.client.publish(channel, value, function(e, replies) {
          if (e != null) {
            object.error(e, "redis unable to push " + value + " to channel " + channel, 'Data.publish.client');
            return object.quit();
          } else {
            if ((object['_events'] != null) && (object['_events']['success'] != null)) {
              object.emit('success', replies, channel);
            }
            return object.quit();
          }
        });
      } catch (e) {
        return this.error(e, "could not push " + value + " to channel " + channel, 'Data.publish');
      }
    };
    Data.prototype.quit = function() {
      return this.client.quit();
    };
    return Data;
  })();
  module.exports = Data;
}).call(this);
