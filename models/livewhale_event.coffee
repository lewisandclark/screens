
events = require 'events'
redis = require 'redis'

env = require __dirname + '/../config/env'
DateWrapper = require __dirname + '/../helpers/date'

class LiveWhaleEvent

  constructor: (parsed_data, child=null) ->
    @error = require __dirname + '/../helpers/error'
    @db = require __dirname + '/../helpers/db'
    @livewhale_api = require __dirname + '/../helpers/livewhale_api'
    @type = 'events'
    parsed_data['parent_id'] = 6520 if parsed_data['id'] isnt 6520 # remove me later
    @properties = parsed_data
    @child = child if child?
    # @find_parents()

  @['prototype'] = new events.EventEmitter

  timestamp: () ->
    DateWrapper.parse(@properties['start_time'])

  has_parent: () ->
    (@properties['parent_id']?)

  has_child: () ->
    (@child?)

  live: () ->
    return @ if @is_live()
    return @child.live() if @has_child()
    null

  is_live: () ->
    (@properties['status'] is 1)

  authoritative: () ->
    return @ if @is_authoritative()
    return @child.authoritative() if @has_child()
    null
  
  is_authoritative: () ->
    (env.authoritative_sources.indexOf(@properties['group']['id']) >= 0)

  place: () ->
    return @ if @has_at_least_one_place()
    return @child.has_at_least_one_place() if @has_child()
    null

  has_at_least_one_place: () ->
    (@properties['places']? and @properties['places'].length > 0 and @properties['places'][0]['id']?)

  find_parents: () ->
    if @has_parent()
      object = @
      db = new @db
      db.on 'success',
        (data) ->
          if data is null
            livewhale_api = new object.livewhale_api
            livewhale_api.collect object.type, object.properties['parent_id'], object
          else
            parsed = JSON.parse data
            parent = new LiveWhaleEvent(parsed, object)
      db.get @type, @properties['parent_id']
    else
      @find_best()

  find_best: () ->
    best = @authoritative()
    console.log best
    if best? and best.is_live()
      best.merge_places()
    else
      best = @live()
      best.merge_places() if best?

  merge_places: () ->
    best_place = @place()
    @properties['places'] = best_place.properties['places'] if best_place? and best_place isnt @
    @publish()

  publish: () ->
    return if @properties['group'] is null
    for channel, criteria of env.channels
      if criteria.schools.indexOf(@properties['group']['school']) >= 0 or criteria.group_ids.indexOf(@properties['group']['id']) >= 0
        object = @
        db = new @db
        try
          db.on 'success',
            (replies, key) ->
              console.log object
              if replies > 0
                pubsub = new object.db()
                pubsub.publish "channel:#{key.substring(9)}", JSON.stringify(object.properties),
                  (replies) ->
                    object.emit('success', replies) if object['_events']? and object['_events']['success']?
          db.add_to_sorted_set "timeline:#{channel}", @timestamp(), "#{@type}:#{@properties['id']}"
        catch e
          @error e, "unable to save #{@type} #{@properties['id']}", 'LiveWhaleEvent.publish'

  save: () ->
    object = @
    db = new @db
    try
      db.on 'success',
        (stored) ->
          object.emit('success', stored) if object['_events']? and object['_events']['success']?
      db.set @type, @properties
    catch e
      @error e, "unable to save #{@type} #{@properties['id']}", 'LiveWhaleEvent.save'

  delete: (id=null) -> # delete parents too?
    object = @
    db = new @db
    try
      id = @properties['id'] if id is null
      db.on 'success',
        (type, id) ->
          console.log "#{type} #{id} was deleted"
          object.emit('success', type, id) if object['_events']? and object['_events']['success']?
      db.del @type, @properties['id']
    catch e
      @error e, "unable to delete #{@type} #{@properties['id']}", 'LiveWhaleEvent.delete'

module.exports = LiveWhaleEvent
