(function() {
  var Retrieve, env, events;
  events = require('events');
  env = require(__dirname + '/../config/env');
  Retrieve = (function() {
    function Retrieve(socket) {
      var db;
      this.socket = socket;
      this.error = require(__dirname + '/error');
      db = require(__dirname + '/db');
      this.db = new db;
    }
    Retrieve['prototype'] = new events.EventEmitter;
    Retrieve.prototype.set_channel = function() {
      var channel, object;
      channel = 'undergraduate';
      object = this;
      return this.socket.set('channel', channel, function() {
        return object.socket.emit('channel', {
          channel: channel
        });
      });
    };
    Retrieve.prototype.get_channel = function(count) {
      var object;
      object = this;
      return this.socket.get('channel', function(e, channel) {
        if (e != null) {
          object.error(e, "unable to retrieve channel for socket", 'Retrieve.retrieve_items.socket');
          return object.socket.emit('error', {
            error: "could not get channel from socket",
            method: "Retrieve.get_channel"
          });
        } else {
          return object.get_lead_member(channel, count);
        }
      });
    };
    Retrieve.prototype.get_lead_member = function(channel, count) {
      var object;
      object = this;
      this.db.on('get_from_sorted_set_success', function(members, key) {
        if ((members != null) && members.length > 0) {
          return object.get_starting_index(channel, members, count);
        } else {
          return object.socket.emit('empty', {
            channel: channel
          });
        }
      });
      return this.db.get_from_sorted_set("timeline:" + channel, (new Date()).getTime(), "+inf");
    };
    Retrieve.prototype.get_starting_index = function(channel, members, count) {
      var object;
      object = this;
      this.db.on('get_index_of_sorted_set_item_success', function(index, key) {
        if ((index != null) && index >= 0) {
          return object.get_items(channel, index, count);
        } else {
          return object.socket.emit('error', {
            error: "could not get index for lead member",
            method: "Retrieve.get_items"
          });
        }
      });
      return this.db.get_index_of_sorted_set_item("timeline:" + channel, members[0]);
    };
    Retrieve.prototype.get_items = function(channel, index, count) {
      var object;
      object = this;
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
      return this.db.get_from_sorted_set_by_index("timeline:" + channel, index, index + count);
    };
    Retrieve.prototype.push = function(members) {
      var member, object, _i, _len, _results;
      object = this;
      this.db.on('get_success', function(item, key) {
        return object.socket.volatile.emit('update', {
          key: key,
          item: item
        });
      });
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
