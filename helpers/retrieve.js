(function() {
  var Retrieve, env, events, natural, nounInflector;
  events = require('events');
  env = require(__dirname + '/../config/env');
  natural = require('natural');
  nounInflector = new natural.NounInflector();
  Retrieve = (function() {
    function Retrieve(socket) {
      this.socket = socket;
      this.error = require(__dirname + '/error');
      this.db = require(__dirname + '/db');
      this.livewhale_event = require(__dirname + '/../models/livewhale_event');
    }
    Retrieve['prototype'] = new events.EventEmitter;
    Retrieve.prototype.channel = function() {
      var channel, object;
      channel = 'undergraduate';
      object = this;
      return this.socket.set('channel', channel, function() {
        return object.socket.emit('channel', {
          channel: channel
        });
      });
    };
    Retrieve.prototype.items = function(count) {
      var db, object;
      object = this;
      db = new this.db;
      try {
        return this.socket.get('channel', function(e, channel) {
          var d;
          if (e != null) {
            return object.error(e, "unable to retrieve channel for socket", 'Retrieve.retrieve_items.socket');
          } else {
            d = new Date();
            d = d.getTime();
            db.on('get_from_sorted_set_success', function(items, key) {
              if ((items != null) && items.length > 0) {
                db.on('get_index_of_sorted_set_item_success', function(index, key) {
                  db.on('get_from_sorted_set_by_index_success', function(items, key) {
                    return object.socket.emit('items', {
                      items: items
                    });
                  });
                  return db.get_from_sorted_set_by_index("timeline:" + channel, index, index + count);
                });
                return db.get_index_of_sorted_set_item("timeline:" + channel, items[0]);
              }
            });
            return db.get_from_sorted_set("timeline:" + channel, d, "+inf");
          }
        });
      } catch (e) {
        return this.error(e, "could not retrieve items", 'Retrieve.retrieve_items');
      }
    };
    return Retrieve;
  })();
  module.exports = Retrieve;
}).call(this);
