(function() {
  var Retrieve, env, events;
  events = require('events');
  env = require(__dirname + '/../config/env');
  Retrieve = (function() {
    function Retrieve(socket) {
      var db;
      this.error = require(__dirname + '/error');
      db = require(__dirname + '/db');
      this.db = new db;
      this.socket = socket;
      this.screen = this.set_screen();
      if (this.screen != null) {
        this.socket.emit('screen', this.screen);
      }
    }
    Retrieve['prototype'] = new events.EventEmitter;
    Retrieve.prototype.set_screen = function() {
      var address, name, screen, _ref;
      address = this.socket.handshake.address.address;
      if (address === null) {
        return null;
      }
      _ref = env.screens;
      for (name in _ref) {
        screen = _ref[name];
        if (screen['ip'] === address) {
          return screen;
        }
      }
      return null;
    };
    Retrieve.prototype.get_lead_member = function(count) {
      var object;
      object = this;
      if (this.db.listeners('get_from_sorted_set_success').length === 0) {
        this.db.on('get_from_sorted_set_success', function(members, key) {
          if ((members != null) && members.length > 0) {
            return object.get_starting_index(members, count);
          } else {
            return object.socket.emit('empty', {
              channel: object.screen['channel']
            });
          }
        });
      }
      return this.db.get_from_sorted_set("timeline:" + this.screen['channel'], (new Date()).getTime(), "+inf");
    };
    Retrieve.prototype.get_starting_index = function(members, count) {
      var object;
      object = this;
      if (this.db.listeners('get_index_of_sorted_set_item_success').length === 0) {
        this.db.on('get_index_of_sorted_set_item_success', function(index, key) {
          if ((index != null) && index >= 0) {
            return object.get_items(index, count);
          } else {
            return object.socket.emit('error', {
              error: "could not get index for lead member",
              method: "Retrieve.get_items"
            });
          }
        });
      }
      return this.db.get_index_of_sorted_set_item("timeline:" + this.screen['channel'], members[0]);
    };
    Retrieve.prototype.get_items = function(index, count) {
      var object;
      object = this;
      if (this.db.listeners('get_from_sorted_set_by_index_success').length === 0) {
        this.db.on('get_from_sorted_set_by_index_success', function(members, key) {
          if ((members != null) && members.length > 0) {
            return object.push(members);
          } else {
            return object.socket.emit('error', {
              error: "could not get index ",
              method: "Retrieve.get_items"
            });
          }
        });
      }
      return this.db.get_from_sorted_set_by_index("timeline:" + this.screen['channel'], index, index + count);
    };
    Retrieve.prototype.push = function(members) {
      var member, object, _i, _len, _results;
      object = this;
      if (this.db.listeners('get_success').length === 0) {
        this.db.on('get_success', function(item, key) {
          return object.socket.emit('update', {
            key: key,
            item: item
          });
        });
      }
      _results = [];
      for (_i = 0, _len = members.length; _i < _len; _i++) {
        member = members[_i];
        _results.push(this.db.get(member));
      }
      return _results;
    };
    return Retrieve;
  })();
  module.exports = Retrieve;
}).call(this);
