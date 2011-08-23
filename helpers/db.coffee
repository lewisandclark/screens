
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
          else
            object.emit('exists_success', if replies is 1 then true else false) if object['_events']? and object['_events']['exists_success']?
    catch e
      @error e, "could not test existence of #{type} #{id}", 'Data.exists'

  get: (key) ->
    object = @
    try
      @client.get key,
        (e, replies) ->
          if e?
            object.error e, "redis unable to get #{key}", 'Data.get.client'
          else
            object.emit('get_success', replies, key) if object['_events']? and object['_events']['get_success']?
    catch e
      @error e, "could not get #{type} #{id}", 'Data.get'

  set: (key, data) ->
    object = @
    try
      @client.set key, JSON.stringify(data),
        (e, replies) ->
          if e?
            object.error e, "redis unable to set #{key}", 'Data.set.client'
          else
            object.emit('set_success', replies) if object['_events']? and object['_events']['set_success']?
            object.add_to_set("global:keys", key)
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
          else
            object.emit('del_success', replies) if object['_events']? and object['_events']['del_success']?
    catch e
      @error e, "could not delete #{type} #{id}", 'Data.del'

  append_to_list: (key, value) ->
    object = @
    try
      @client.rpush key, value,
        (e, replies) ->
          if e?
            object.error e, "redis unable to append #{value} to set #{key}", 'Data.rpush.client'
          else
            object.emit('append_to_list_success', replies, key) if object['_events']? and object['_events']['append_to_list_success']?
    catch e
      @error e, "could not append #{value} to set #{key}", 'Data.rpush'

  add_to_set: (key, value) ->
    object = @
    try
      @client.sadd key, value,
        (e, replies) ->
          if e?
            object.error e, "redis unable to add #{value} to set #{key}", 'Data.sadd.client'
          else
            object.emit('add_to_set_success', replies, key) if object['_events']? and object['_events']['add_to_set_success']?
    catch e
      @error e, "could not add #{value} to set #{key}", 'Data.sadd'

  add_to_sorted_set: (key, rank, value) ->
    object = @
    try
      @client.zadd key, rank, value,
        (e, replies) ->
          if e?
            object.error e, "redis unable to add #{value} of #{rank} to sorted set #{key}", 'Data.zadd.client'
          else
            object.emit('add_to_sorted_set_success', replies, key) if object['_events']? and object['_events']['add_to_sorted_set_success']?
    catch e
      @error e, "could not add #{value} of #{rank} to sorted set #{key}", 'Data.zadd'

  get_from_sorted_set: (key, min, max) ->
    object = @
    try
      @client.zrangebyscore key, min, max,
        (e, replies) ->
          if e?
            object.error e, "redis unable to get from sorted set #{key} starting from #{min}", 'Data.zrangebyscore.client'
          else
            object.emit('get_from_sorted_set_success', replies, key) if object['_events']? and object['_events']['get_from_sorted_set_success']?
    catch e
      @error e, "could not get from sorted set #{key} starting from #{min}", 'Data.zrangebyscore'

  get_index_of_sorted_set_item: (key, member) ->
    object = @
    try
      @client.zrank key, member,
        (e, replies) ->
          if e?
            object.error e, "redis unable to get from sorted set #{key} starting from #{min}", 'Data.zrank.client'
          else
            object.emit('get_index_of_sorted_set_item_success', replies, key) if object['_events']? and object['_events']['get_index_of_sorted_set_item_success']?
    catch e
      @error e, "could not get from sorted set #{key} starting from #{min}", 'Data.zrank'

  get_from_sorted_set_by_index: (key, start, stop) ->
    object = @
    try
      @client.zrange key, start, stop,
        (e, replies) ->
          if e?
            object.error e, "redis unable to get from sorted set #{key} starting from #{start}", 'Data.zrange.client'
          else
            object.emit('get_from_sorted_set_by_index_success', replies, key) if object['_events']? and object['_events']['get_from_sorted_set_by_index_success']?
    catch e
      @error e, "could not get from sorted set #{key} starting from #start", 'Data.zrange'

  quit: () ->
    @client.quit()

module.exports = Data
