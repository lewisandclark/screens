
events = require 'events'

env = require __dirname + '/../config/env'
natural = require 'natural'
nounInflector = new natural.NounInflector()

class Filter

  constructor: (io) ->
    @io = io
    @error = require __dirname + '/error'
    @db = require __dirname + '/db'
    @qrcode = require __dirname + '/qrcode'
    @livewhale_api = require __dirname + '/livewhale_api'
    @livewhale_event = require __dirname + '/../models/livewhale_event'

  @['prototype'] = new events.EventEmitter

  process: (update={}) ->
    object = @
    if update['is_deleted'] or update['is_removed']
      @livewhale_event.delete update['object_id']
      @remove_from_screens "#{update['object']}:#{update['object_id']}"
      @remove_from_timeline "#{update['object']}:#{update['object_id']}"
    else
      livewhale_api = new @livewhale_api
      livewhale_api.on 'success',
        (type, parsed) ->
          item = new object["livewhale_#{nounInflector.singularize(type)}"] parsed
          if item['properties']['status'] isnt 1
            object.remove_from_screens(item)
            object.remove_from_timeline(item)
            item.delete()
          else
            item.on 'save_success',
              (stored) ->
                return if item['properties']['qrcode']?
                object.push_to_screens(@)
                object.push_to_timeline(@)
                object.get_qrcode(@)
            item.save()
      livewhale_api.collect update['object'], update['object_id']

  push_to_screens: (item) ->
    @io.sockets.volatile.emit 'update', { key: item.key(), item: JSON.stringify(item['properties']) }

  push_to_timeline: (item) ->
    db = new @db
    try
      db.add_to_sorted_set("timeline:#{channel}", item.timestamp(), item.key()) for channel in item['properties']['channels']
    catch e
      @error e, "unable to push #{item.key()} to timeline(s)", 'Filter.push_to_timeline'

  get_qrcode: (item) ->
    return if item['qrcode']?
    object = @
    qrcode = new @qrcode
    qrcode.on 'success',
      (url) -> 
        item['properties']['qrcode'] = url
        item.on 'save_success',
          (stored) ->
            object.push_to_screens(@)
        item.save()
    qrcode.generate item['properties']['link']

  remove_from_screens: (item) ->
    @io.sockets.volatile.emit 'remove', { key: (if typeof item is 'string' then item else item.key()) }

  remove_from_timeline: (item) ->
    db = new @db
    key = (if typeof item is 'string' then item else item.key())
    try
      db.remove_from_sorted_set("timeline:#{channel}", key) for channel in item['properties']['channels']
    catch e
      @error e, "unable to remove #{key} from timeline(s)", 'Filter.remove_from_timeline'

module.exports = Filter
