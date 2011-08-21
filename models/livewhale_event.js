(function() {
  var DateWrapper, LiveWhaleEvent, env, events, redis;
  events = require('events');
  redis = require('redis');
  env = require(__dirname + '/../config/env');
  DateWrapper = require(__dirname + '/../helpers/date');
  LiveWhaleEvent = (function() {
    function LiveWhaleEvent(parsed_data, child) {
      if (child == null) {
        child = null;
      }
      this.error = require(__dirname + '/../helpers/error');
      this.db = require(__dirname + '/../helpers/db');
      this.livewhale_api = require(__dirname + '/../helpers/livewhale_api');
      this.type = 'events';
      if (parsed_data['id'] !== 6520) {
        parsed_data['parent_id'] = 6520;
      }
      this.properties = parsed_data;
      if (child != null) {
        this.child = child;
      }
    }
    LiveWhaleEvent['prototype'] = new events.EventEmitter;
    LiveWhaleEvent.prototype.timestamp = function() {
      return DateWrapper.parse(this.properties['start_time']);
    };
    LiveWhaleEvent.prototype.has_parent = function() {
      return this.properties['parent_id'] != null;
    };
    LiveWhaleEvent.prototype.has_child = function() {
      return this.child != null;
    };
    LiveWhaleEvent.prototype.live = function() {
      if (this.is_live()) {
        return this;
      }
      if (this.has_child()) {
        return this.child.live();
      }
      return null;
    };
    LiveWhaleEvent.prototype.is_live = function() {
      return this.properties['status'] === 1;
    };
    LiveWhaleEvent.prototype.authoritative = function() {
      if (this.is_authoritative()) {
        return this;
      }
      if (this.has_child()) {
        return this.child.authoritative();
      }
      return null;
    };
    LiveWhaleEvent.prototype.is_authoritative = function() {
      return env.authoritative_sources.indexOf(this.properties['group']['id']) >= 0;
    };
    LiveWhaleEvent.prototype.place = function() {
      if (this.has_at_least_one_place()) {
        return this;
      }
      if (this.has_child()) {
        return this.child.has_at_least_one_place();
      }
      return null;
    };
    LiveWhaleEvent.prototype.has_at_least_one_place = function() {
      return (this.properties['places'] != null) && this.properties['places'].length > 0 && (this.properties['places'][0]['id'] != null);
    };
    LiveWhaleEvent.prototype.find_parents = function() {
      var db, object;
      if (this.has_parent()) {
        object = this;
        db = new this.db;
        db.on('success', function(data) {
          var livewhale_api, parent, parsed;
          if (data === null) {
            livewhale_api = new object.livewhale_api;
            return livewhale_api.collect(object.type, object.properties['parent_id'], object);
          } else {
            parsed = JSON.parse(data);
            return parent = new LiveWhaleEvent(parsed, object);
          }
        });
        return db.get(this.type, this.properties['parent_id']);
      } else {
        return this.find_best();
      }
    };
    LiveWhaleEvent.prototype.find_best = function() {
      var best;
      best = this.authoritative();
      console.log(best);
      if ((best != null) && best.is_live()) {
        return best.merge_places();
      } else {
        best = this.live();
        if (best != null) {
          return best.merge_places();
        }
      }
    };
    LiveWhaleEvent.prototype.merge_places = function() {
      var best_place;
      best_place = this.place();
      if ((best_place != null) && best_place !== this) {
        this.properties['places'] = best_place.properties['places'];
      }
      return this.publish();
    };
    LiveWhaleEvent.prototype.publish = function() {
      var channel, criteria, db, object, _ref, _results;
      if (this.properties['group'] === null) {
        return;
      }
      _ref = env.channels;
      _results = [];
      for (channel in _ref) {
        criteria = _ref[channel];
        _results.push((function() {
          if (criteria.schools.indexOf(this.properties['group']['school']) >= 0 || criteria.group_ids.indexOf(this.properties['group']['id']) >= 0) {
            object = this;
            db = new this.db;
            try {
              db.on('success', function(replies, key) {
                var pubsub;
                console.log(object);
                if (replies > 0) {
                  pubsub = new object.db();
                  return pubsub.publish("channel:" + (key.substring(9)), JSON.stringify(object.properties), function(replies) {
                    if ((object['_events'] != null) && (object['_events']['success'] != null)) {
                      return object.emit('success', replies);
                    }
                  });
                }
              });
              return db.add_to_sorted_set("timeline:" + channel, this.timestamp(), "" + this.type + ":" + this.properties['id']);
            } catch (e) {
              return this.error(e, "unable to save " + this.type + " " + this.properties['id'], 'LiveWhaleEvent.publish');
            }
          }
        }).call(this));
      }
      return _results;
    };
    LiveWhaleEvent.prototype.save = function() {
      var db, object;
      object = this;
      db = new this.db;
      try {
        db.on('success', function(stored) {
          if ((object['_events'] != null) && (object['_events']['success'] != null)) {
            return object.emit('success', stored);
          }
        });
        return db.set(this.type, this.properties);
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
        db.on('success', function(type, id) {
          console.log("" + type + " " + id + " was deleted");
          if ((object['_events'] != null) && (object['_events']['success'] != null)) {
            return object.emit('success', type, id);
          }
        });
        return db.del(this.type, this.properties['id']);
      } catch (e) {
        return this.error(e, "unable to delete " + this.type + " " + this.properties['id'], 'LiveWhaleEvent.delete');
      }
    };
    return LiveWhaleEvent;
  })();
  module.exports = LiveWhaleEvent;
}).call(this);
