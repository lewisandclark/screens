
events = require 'events'
redis = require 'redis'

env = require __dirname + '/../config/env'

class Data

  constructor: () ->
    @error = require __dirname + '/error'
    @client = redis.createClient env.redis.port, env.redis.host

  @['prototype'] = new events.EventEmitter

  content_key: (type='events', id) ->
    return "#{type}:#{id}" if id?
    @error 'key failure', "unable to create key from #{type} and #{id}", 'Data.content_key'

  exists: (type='events', id) ->
    object = @
    try
      key = @content_key(type, id)
      @client.exists key,
        (e, replies) ->
          if e?
            object.error e, "redis unable to test existence of #{key}", 'Data.exists.client'
            object.quit()
          else
            object.emit('success', if replies is 1 then true else false) if object['_events']? and object['_events']['success']?
            object.quit()
    catch e
      @error e, "could not test existence of #{type} #{id}", 'Data.exists'

  get: (type='events', id) ->
    object = @
    try
      key = @content_key(type, id)
      @client.get key,
        (e, replies) ->
          if e?
            object.error e, "redis unable to get #{key}", 'Data.get.client'
            object.quit()
          else
            object.emit('success', replies) if object['_events']? and object['_events']['success']?
            object.quit()
    catch e
      @error e, "could not get #{type} #{id}", 'Data.get'

  set: (type='events', data) ->
    object = @
    try
      key = @content_key(type, data['id'])
      @client.set key, JSON.stringify(data),
        (e, replies) ->
          if e?
            object.error e, "redis unable to set #{key}", 'Data.set.client'
            object.quit()
          else
            object.emit('success', replies) if object['_events']? and object['_events']['success']?
            object.quit()
            global_list = new Data()
            global_list.add_to_set("global:keys", key)
    catch e
      @error e, "could not set #{type} #{data['id']}", 'Data.set'

  del: (type='events', id) ->
    object = @
    try
      key = @content_key(type, id)
      @client.del key,
        (e, replies) ->
          if e?
            object.error e, "redis unable to delete #{key}", 'Data.del.client'
            object.quit()
          else
            object.emit('success', replies) if object['_events']? and object['_events']['success']?
            object.quit()
    catch e
      @error e, "could not delete #{type} #{id}", 'Data.del'

  add_to_sorted_set: (key, rank, value) ->
    object = @
    try
      @client.zadd key, rank, value,
        (e, replies) ->
          if e?
            object.error e, "redis unable to add #{value} of #{rank} to sorted set #{key}", 'Data.zadd.client'
            object.quit()
          else
            object.emit('success', replies, key) if object['_events']? and object['_events']['success']?
            object.quit()
    catch e
      @error e, "could not add #{value} of #{rank} to sorted set #{key}", 'Data.zadd'

  add_to_set: (key, value) ->
    object = @
    try
      @client.sadd key, value,
        (e, replies) ->
          if e?
            object.error e, "redis unable to add #{value} to set #{key}", 'Data.sadd.client'
            object.quit()
          else
            object.emit('success', replies, key) if object['_events']? and object['_events']['success']?
            object.quit()
    catch e
      @error e, "could not add #{value} to set #{key}", 'Data.sadd'

  publish: (channel, value) ->
    object = @
    try
      @client.publish channel, value,
        (e, replies) ->
          if e?
            object.error e, "redis unable to push #{value} to channel #{channel}", 'Data.publish.client'
            object.quit()
          else
            object.emit('success', replies, channel) if object['_events']? and object['_events']['success']?
            object.quit()
    catch e
      @error e, "could not push #{value} to channel #{channel}", 'Data.publish'

  quit: () ->
    @client.quit()

module.exports = Data
