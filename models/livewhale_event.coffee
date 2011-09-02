
events = require 'events'
redis = require 'redis'

env = require __dirname + '/../config/env'
DateWrapper = require __dirname + '/../helpers/date'

class LiveWhaleEvent

  constructor: (parsed_data) ->
    @error = require __dirname + '/../helpers/error'
    @db = require __dirname + '/../helpers/db'
    @type = 'events'
    @validations =
      id: "(typeof this.properties[property] === 'number' && parseInt(this.properties[property]) === this.properties[property] && this.properties[property] > 0)"
      title: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)"
      summary: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)"
      group: "(typeof this.properties[property] === 'object' && typeof this.properties[property]['id'] === 'number' && parseInt(this.properties[property]['id']) === this.properties[property]['id'] && this.properties[property]['id'] > 0)"
      link: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)"
      start_time: "(Date.parse(this.properties[property]) > 0)"
      places: "(typeof this.properties[property] === 'object' && this.properties[property].length > 0 && typeof this.properties[property][0]['id'] === 'number' && parseInt(this.properties[property][0]['id']) === this.properties[property][0]['id'] && this.properties[property][0]['id'] > 0)"
    @properties = parsed_data
    @set_channels()

  @['prototype'] = new events.EventEmitter

  key: () ->
    return @error "key error", "unable to generate key due to null id", 'LiveWhaleEvent.key' if @properties['id'] is null
    "#{@type}:#{@properties['id']}"

  timestamp: () ->
    DateWrapper.parse(@properties['start_time'])

  date: (timestamp=@properties['start_time']) ->
    new Date(timestamp)

  has_parent: () ->
    (@properties['parent_id']?)

  is_live: () ->
    (@properties['status'] is 1)

  is_authoritative: () ->
    (env.authoritative_sources.indexOf(@properties['group']['id']) >= 0)

  set_channels: () ->
    return [] if @properties['group'] is null
    @properties['channels'] = []
    for channel, criteria of env.channels
      @properties['channels'].push channel if criteria.schools.indexOf(@properties['group']['school']) >= 0 or criteria.group_ids.indexOf(@properties['group']['id']) >= 0

  valid: () ->
    for property, test of @validations
      return false if !eval(test)
    true

  save: () ->
    return @error("validation failed", "unable to meet validation checks for #{@properties}", 'LiveWhaleEvent.save') if !@valid()
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
      console.log "ID: #{id}"
      db.on 'del_success',
        (type, id) ->
          object.emit('delete_success', type, id) if object['_events']? and object['_events']['delete_success']?
      db.del @key(), @properties['id']
    catch e
      @error e, "unable to delete #{@type} #{@properties['id']}", 'LiveWhaleEvent.delete'

module.exports = LiveWhaleEvent
