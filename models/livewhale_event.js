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
      this.validations = {
        id: "(typeof this.properties[property] === 'number' && parseInt(this.properties[property]) === this.properties[property] && this.properties[property] > 0)",
        title: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)",
        summary: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)",
        group: "(typeof this.properties[property] === 'object' && typeof this.properties[property]['id'] === 'number' && parseInt(this.properties[property]['id']) === this.properties[property]['id'] && this.properties[property]['id'] > 0)",
        link: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)",
        start_time: "(Date.parse(this.properties[property]) > 0)",
        places: "(typeof this.properties[property] === 'object' && this.properties[property].length > 0 && typeof this.properties[property][0]['id'] === 'number' && parseInt(this.properties[property][0]['id']) === this.properties[property][0]['id'] && this.properties[property][0]['id'] > 0)"
      };
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
    LiveWhaleEvent.prototype.date = function(timestamp) {
      if (timestamp == null) {
        timestamp = this.properties['start_time'];
      }
      return new Date(timestamp);
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
    LiveWhaleEvent.prototype.channels = function() {
      var channel, channels, criteria, _ref;
      if (this.properties['group'] === null) {
        return [];
      }
      channels = [];
      _ref = env.channels;
      for (channel in _ref) {
        criteria = _ref[channel];
        if (criteria.schools.indexOf(this.properties['group']['school']) >= 0 || criteria.group_ids.indexOf(this.properties['group']['id']) >= 0) {
          channels[channels.length] = channel;
        }
      }
      return channels;
    };
    LiveWhaleEvent.prototype.valid = function() {
      var property, test, _ref;
      _ref = this.validations;
      for (property in _ref) {
        test = _ref[property];
        if (!eval(test)) {
          return false;
        }
      }
      return true;
    };
    LiveWhaleEvent.prototype.save = function() {
      var db, object;
      if (!this.valid()) {
        return this.error("validation failed", "unable to meet validation checks for " + this.properties, 'LiveWhaleEvent.save');
      }
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
        console.log("ID: " + id);
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
