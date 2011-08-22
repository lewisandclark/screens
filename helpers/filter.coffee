
events = require 'events'

env = require __dirname + '/../config/env'
natural = require 'natural'
nounInflector = new natural.NounInflector()

class Filter

  constructor: (io) ->
    @io = io
    @error = require __dirname + '/error'
    @db = require __dirname + '/db'
    @livewhale_api = require __dirname + '/livewhale_api'
    @livewhale_event = require __dirname + '/../models/livewhale_event'

  @['prototype'] = new events.EventEmitter

  process: (update={}) ->
    object = @
    if update['is_deleted'] or update['is_removed']
      @livewhale_event.delete update['object_id']
      @remove_from_screens update['object'], update['object_id']
    else
      livewhale_api = new @livewhale_api
      livewhale_api.on 'success',
        (type, parsed) ->
          # need to test live status change here if now not 1
          item = new object["livewhale_#{nounInflector.singularize(type)}"] parsed
          item.on 'save_success',
            (stored) ->
              object.push_to_screens(@)
              object.push_to_timeline(@)
          item.save()
      livewhale_api.collect update['object'], update['object_id']

  push_to_screens: (item) ->
    @io.sockets.emit 'update', { item: item }

  push_to_timeline: (item) ->
    db = new @db
    try
      db.add_to_sorted_set("timeline:#{channel}", item.timestamp(), item.key()) for channel in item.channels()
    catch e
      @error e, "unable to push #{item.key()} to timeline(s)", 'Filter.push_to_timeline'

  remove_from_screens: (type='events', id) ->
    @io.sockets.emit 'removed', { type: type, id: id }

module.exports = Filter
