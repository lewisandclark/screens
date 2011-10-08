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
        id: {
          test: "(typeof this.properties[property] === 'number' && parseInt(this.properties[property]) === this.properties[property] && this.properties[property] > 0)",
          message: "id is not an integer"
        },
        title: {
          test: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)",
          message: "title is empty"
        },
        summary: {
          test: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)",
          message: "summary is empty"
        },
        group: {
          test: "(typeof this.properties[property] === 'object' && typeof this.properties[property]['id'] === 'number' && parseInt(this.properties[property]['id']) === this.properties[property]['id'] && this.properties[property]['id'] > 0)",
          message: "group is empty or not formed properly"
        },
        link: {
          test: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)",
          message: "link is empty"
        },
        start_time: {
          test: "(Date.parse(this.properties[property]) > 0)",
          message: "start_time is empty or not a date/time"
        },
        places: {
          test: "(typeof this.properties[property] === 'object' && this.properties[property].length > 0 && typeof this.properties[property][0]['id'] === 'number' && parseInt(this.properties[property][0]['id']) === this.properties[property][0]['id'] && this.properties[property][0]['id'] > 0)",
          message: "places is empty or not formed properly"
        }
      };
      delete parsed_data['description'];
      this.properties = parsed_data;
      this.set_channels();
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
    LiveWhaleEvent.prototype.is_institutional = function() {
      return env.institutional.indexOf(this.properties['group']['school']) >= 0;
    };
    LiveWhaleEvent.prototype.set_channels = function() {
      var channel, criteria, directional_tag, directional_tags, tag, _ref, _ref2, _results, _results2;
      if (this.properties['group'] === null) {
        return [];
      }
      this.properties['channels'] = [];
      if (this.is_institutional()) {
        directional_tags = (function() {
          var _i, _len, _ref, _results;
          _ref = this.properties['tags'];
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tag = _ref[_i];
            if (env.directional_tags.indexOf(tag) >= 0) {
              _results.push(tag);
            }
          }
          return _results;
        }).call(this);
        _ref = env.channels;
        _results = [];
        for (channel in _ref) {
          criteria = _ref[channel];
          _results.push((function() {
            var _i, _len, _results2;
            _results2 = [];
            for (_i = 0, _len = directional_tags.length; _i < _len; _i++) {
              directional_tag = directional_tags[_i];
              _results2.push(criteria.tags.indexOf(directional_tag) >= 0 && !this.properties['channels'].indexOf(channel) >= 0 ? this.properties['channels'].push(channel) : void 0);
            }
            return _results2;
          }).call(this));
        }
        return _results;
      } else {
        _ref2 = env.channels;
        _results2 = [];
        for (channel in _ref2) {
          criteria = _ref2[channel];
          _results2.push(criteria.schools.indexOf(this.properties['group']['school']) >= 0 || criteria.group_ids.indexOf(this.properties['group']['id']) >= 0 ? this.properties['channels'].push(channel) : void 0);
        }
        return _results2;
      }
    };
    LiveWhaleEvent.prototype.save = function() {
      var db, object, property, validation, _ref;
      _ref = this.validations;
      for (property in _ref) {
        validation = _ref[property];
        if (!eval(validation['test'])) {
          this.error("validation failed for " + (this.key()), validation['message'], 'LiveWhaleEvent.save.validate');
          return false;
        }
      }
      object = this;
      db = new this.db;
      try {
        db.on('set_success', function(stored) {
          console.log(stored);
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
