
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
      id:
      	test: "(typeof this.properties[property] === 'number' && parseInt(this.properties[property]) === this.properties[property] && this.properties[property] > 0)"
      	message: "id is not an integer"
      title:
      	test: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)"
      	message: "title is empty"
      summary:
      	test: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)"
      	message: "summary is empty"
      group:
      	test: "(typeof this.properties[property] === 'object' && typeof this.properties[property]['id'] === 'number' && parseInt(this.properties[property]['id']) === this.properties[property]['id'] && this.properties[property]['id'] > 0)"
      	message: "group is empty or not formed properly"
      link:
      	test: "(typeof this.properties[property] === 'string' && this.properties[property].length > 0)"
      	message: "link is empty"
      start_time:
      	test: "(Date.parse(this.properties[property]) > 0)"
      	message: "start_time is empty or not a date/time"
      places:
      	test: "(typeof this.properties[property] === 'object' && this.properties[property].length > 0 && typeof this.properties[property][0]['id'] === 'number' && parseInt(this.properties[property][0]['id']) === this.properties[property][0]['id'] && this.properties[property][0]['id'] > 0)"
      	message: "places is empty or not formed properly"
    delete parsed_data['description']
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

  is_institutional: () ->
    (env.institutional.indexOf(@properties['group']['school']) >= 0)

  set_channels: () ->
    return null if typeof @properties['group'] is 'undefined' or @properties['group'] is null
    @properties['channels'] = []
    if @is_institutional()
      directional_tags = (tag for tag in @properties['tags'] when env.directional_tags.indexOf(tag) >= 0)
      for channel, criteria of env.channels
        for directional_tag in directional_tags
          @properties['channels'].push channel if criteria.tags.indexOf(directional_tag) >= 0 and not @properties['channels'].indexOf(channel) >= 0
    else
      for channel, criteria of env.channels
        @properties['channels'].push channel if criteria.schools.indexOf(@properties['group']['school']) >= 0 or criteria.group_ids.indexOf(@properties['group']['id']) >= 0

  save: () ->
    for property, validation of @validations
      if !eval(validation['test'])
      	@error("validation failed for #{@key()}", validation['message'], 'LiveWhaleEvent.save.validate')
      	return false
    object = @
    db = new @db
    try
      db.on 'set_success',
        (stored) ->
          console.log stored
          object.emit('save_success', stored) if object['_events']? and object['_events']['save_success']?
      db.set @key(), @properties
    catch e
      @error e, "unable to save #{@type} #{@properties['id']}", 'LiveWhaleEvent.save'

  delete: (id=null) ->
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
