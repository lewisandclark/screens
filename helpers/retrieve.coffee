
events = require 'events'

env = require __dirname + '/../config/env'
natural = require 'natural'
nounInflector = new natural.NounInflector()

class Retrieve

  constructor: (socket) ->
    @socket = socket
    @error = require __dirname + '/error'
    @db = require __dirname + '/db'
    @livewhale_event = require __dirname + '/../models/livewhale_event'

  @['prototype'] = new events.EventEmitter

  channel: () ->
    channel = 'undergraduate'
    object = @
    @socket.set 'channel', channel,
      () ->
        object.socket.emit 'channel', { channel: channel }

  items: (count) ->
    object = @
    db = new @db
    try
      @socket.get 'channel',
        (e, channel) ->
          if e?
            object.error e, "unable to retrieve channel for socket", 'Retrieve.retrieve_items.socket'
          else
            d = new Date()
            d = d.getTime()
            db.on 'get_from_sorted_set_success',
              (items, key) ->
                if items? and items.length > 0
                  db.on 'get_index_of_sorted_set_item_success',
                    (index, key) ->
                      db.on 'get_from_sorted_set_by_index_success',
                        (items, key) ->
                          object.socket.emit 'items', { items: items }
                      db.get_from_sorted_set_by_index("timeline:#{channel}", index, (index + count))
                  db.get_index_of_sorted_set_item("timeline:#{channel}", items[0])
            db.get_from_sorted_set("timeline:#{channel}", d, "+inf")
    catch e
      @error e, "could not retrieve items", 'Retrieve.retrieve_items'




module.exports = Retrieve
