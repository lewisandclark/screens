(function() {
  var DateWrapper, LiveWhaleEvent, env, events, redis;
  events = require('events');
  redis = require('redis');
  env = require(__dirname + '/../config/env');
  DateWrapper = require(__dirname + '/../helpers/date');
  LiveWhaleEvent = (function() {
    function LiveWhaleEvent(parsed_data) {
      this.error = require(__dirname + '/../helpers/error');
      this.db = require(__dirname + '/../helpers/db');
      this.type = 'events';
      this.properties = parsed_data;
    }
    LiveWhaleEvent['prototype'] = new events.EventEmitter;
    LiveWhaleEvent.prototype.key = function() {
      if (this.properties['id'] === null) {
        return this.error("key error", "unable to generate key due to null id", 'LiveWhaleEvent.key');
      }
      return "" + this.type + ":" + this.properties['id'];
    };
    LiveWhaleEvent.prototype.timestamp = function() {
      return DateWrapper.parse(this.properties['start_time']);
    };
    LiveWhaleEvent.prototype.has_parent = function() {
      return this.properties['parent_id'] != null;
    };
    LiveWhaleEvent.prototype.is_live = function() {
      return this.properties['status'] === 1;
    };
    LiveWhaleEvent.prototype.is_authoritative = function() {
      return env.authoritative_sources.indexOf(this.properties['group']['id']) >= 0;
    };
    LiveWhaleEvent.prototype.has_at_least_one_place = function() {
      return (this.properties['places'] != null) && this.properties['places'].length > 0 && (this.properties['places'][0]['id'] != null);
    };
    LiveWhaleEvent.prototype.channels = function() {
      var channel, criteria, _ref, _results;
      if (this.properties['group'] === null) {
        return [];
      }
      _ref = env.channels;
      _results = [];
      for (channel in _ref) {
        criteria = _ref[channel];
        _results.push(criteria.schools.indexOf(this.properties['group']['school']) >= 0 || criteria.group_ids.indexOf(this.properties['group']['id']) >= 0 ? channel : void 0);
      }
      return _results;
    };
    LiveWhaleEvent.prototype.valid = function() {
      return true;
    };
    LiveWhaleEvent.prototype.save = function() {
      var db, object;
      object = this;
      db = new this.db;
      try {
        db.on('set_success', function(stored) {
          if ((object['_events'] != null) && (object['_events']['save_success'] != null)) {
            return object.emit('save_success', stored);
          }
        });
        return db.set(this.key(), this.properties);
      } catch (e) {
        return this.error(e, "unable to save " + this.type + " " + this.properties['id'], 'LiveWhaleEvent.save');
      }
    };
    LiveWhaleEvent.prototype["delete"] = function(id) {
      var db, object;
      if (id == null) {
        id = null;
      }
      object = this;
      db = new this.db;
      try {
        if (id === null) {
          id = this.properties['id'];
        }
        db.on('del_success', function(type, id) {
          if ((object['_events'] != null) && (object['_events']['delete_success'] != null)) {
            return object.emit('delete_success', type, id);
          }
        });
        return db.del(this.key(), this.properties['id']);
      } catch (e) {
        return this.error(e, "unable to delete " + this.type + " " + this.properties['id'], 'LiveWhaleEvent.delete');
      }
    };
    return LiveWhaleEvent;
  })();
  module.exports = LiveWhaleEvent;
}).call(this);
