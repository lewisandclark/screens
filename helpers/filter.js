(function() {
  var Filter, env, events, natural, nounInflector;
  events = require('events');
  env = require(__dirname + '/../config/env');
  natural = require('natural');
  nounInflector = new natural.NounInflector();
  Filter = (function() {
    function Filter(io) {
      this.io = io;
      this.error = require(__dirname + '/error');
      this.db = require(__dirname + '/db');
      this.qrcode = require(__dirname + '/qrcode');
      this.livewhale_api = require(__dirname + '/livewhale_api');
      this.livewhale_event = require(__dirname + '/../models/livewhale_event');
    }
    Filter['prototype'] = new events.EventEmitter;
    Filter.prototype.process = function(update) {
      var item, livewhale_api, object;
      if (update == null) {
        update = {};
      }
      object = this;
      if (update['is_deleted'] || update['is_removed']) {
        item = new object["livewhale_" + (nounInflector.singularize(update['object']))]({
          id: update['object_id']
        });
        item["delete"]();
        this.remove_from_screens("" + update['object'] + ":" + update['object_id']);
        return this.remove_from_timeline("" + update['object'] + ":" + update['object_id']);
      } else {
        livewhale_api = new this.livewhale_api;
        livewhale_api.on('success', function(type, parsed) {
          item = new object["livewhale_" + (nounInflector.singularize(type))](parsed);
          if (item['properties']['status'] !== 1) {
            object.remove_from_screens(item);
            object.remove_from_timeline(item);
            return item["delete"]();
          } else {
            item.on('save_success', function(stored) {
              if (item['properties']['qrcode'] != null) {
                return;
              }
              object.push_to_screens(this);
              object.push_to_timeline(this);
              return object.get_qrcode(this);
            });
            return item.save();
          }
        });
        return livewhale_api.collect(update['object'], update['object_id']);
      }
    };
    Filter.prototype.push_to_screens = function(item) {
      return this.io.sockets.emit('update', {
        key: item.key(),
        item: JSON.stringify(item['properties'])
      });
    };
    Filter.prototype.push_to_timeline = function(item) {
      var channel, db, _i, _len, _ref, _results;
      db = new this.db;
      try {
        _ref = item['properties']['channels'];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          channel = _ref[_i];
          _results.push(db.add_to_sorted_set("timeline:" + channel, item.timestamp(), item.key()));
        }
        return _results;
      } catch (e) {
        return this.error(e, "unable to push " + (item.key()) + " to timeline(s)", 'Filter.push_to_timeline');
      }
    };
    Filter.prototype.get_qrcode = function(item) {
      var object, qrcode;
      if (item['qrcode'] != null) {
        return;
      }
      object = this;
      qrcode = new this.qrcode;
      qrcode.on('success', function(url) {
        item['properties']['qrcode'] = url;
        item.on('save_success', function(stored) {
          return object.push_to_screens(this);
        });
        return item.save();
      });
      return qrcode.generate(item['properties']['link']);
    };
    Filter.prototype.remove_from_screens = function(item) {
      return this.io.sockets.volatile.emit('remove', {
        key: (typeof item === 'string' ? item : item.key())
      });
    };
    Filter.prototype.remove_from_timeline = function(item) {
      var channel, criteria, db, key, _len, _ref, _results;
      db = new this.db;
      key = (typeof item === 'string' ? item : item.key());
      try {
        _ref = env.channels;
        _results = [];
        for (criteria = 0, _len = _ref.length; criteria < _len; criteria++) {
          channel = _ref[criteria];
          _results.push(db.remove_from_sorted_set("timeline:" + channel, key));
        }
        return _results;
      } catch (e) {
        return this.error(e, "unable to remove " + key + " from timeline(s)", 'Filter.remove_from_timeline');
      }
    };
    return Filter;
  })();
  module.exports = Filter;
}).call(this);
