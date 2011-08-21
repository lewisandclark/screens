
events = require 'events'
redis = require 'redis'

env = require __dirname + '/../config/env'
DateWrapper = require __dirname + '/../helpers/date'

class LiveWhaleEvent

  constructor: (parsed_data) ->
    @error = require __dirname + '/../helpers/error'
    @db = require __dirname + '/../helpers/db'
    @type = 'events'
    # parsed_data['parent_id'] = 6520 if parsed_data['id'] isnt 6520 # remove me later
    @properties = parsed_data

  @['prototype'] = new events.EventEmitter

  key: () ->
    return @error "key error", "unable to generate key due to null id", 'LiveWhaleEvent.key' if @properties['id'] is null
    "#{@type}:#{@properties['id']}"

  timestamp: () ->
    DateWrapper.parse(@properties['start_time'])

  has_parent: () ->
    (@properties['parent_id']?)

  is_live: () ->
    (@properties['status'] is 1)

  is_authoritative: () ->
    (env.authoritative_sources.indexOf(@properties['group']['id']) >= 0)

  has_at_least_one_place: () ->
    (@properties['places']? and @properties['places'].length > 0 and @properties['places'][0]['id']?)

  channels: () ->
    return [] if @properties['group'] is null
    for channel, criteria of env.channels
      channel if criteria.schools.indexOf(@properties['group']['school']) >= 0 or criteria.group_ids.indexOf(@properties['group']['id']) >= 0

  valid: () ->
    true

  save: () ->
    object = @
    db = new @db
    try
      db.on 'set_success',
        (stored) ->
          object.emit('save_success', stored) if object['_events']? and object['_events']['save_success']?
      db.set @key(), @properties
    catch e
      @error e, "unable to save #{@type} #{@properties['id']}", 'LiveWhaleEvent.save'

  delete: (id=null) -> # delete parents too?
    object = @
    db = new @db
    try
      id = @properties['id'] if id is null
      db.on 'del_success',
        (type, id) ->
          object.emit('delete_success', type, id) if object['_events']? and object['_events']['delete_success']?
      db.del @key(), @properties['id']
    catch e
      @error e, "unable to delete #{@type} #{@properties['id']}", 'LiveWhaleEvent.delete'

module.exports = LiveWhaleEvent
