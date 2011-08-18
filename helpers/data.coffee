
events = require 'events'
redis = require 'redis'

env = require __dirname + '/../config/env'

class Data

  constructor: () ->
    @error = require __dirname + '/error'
    @client = redis.createClient env.ports.redis, env.hosts.redis

  @['prototype'] = new events.EventEmitter

  content_key: (type='events', id) ->
    return "#{type}:#{id}" if id?
    @error 'key failure', "unable to create key from #{type} and #{id}", 'Data.content_key'

  push_to_channel: () ->
    true

  remove_from_list: () ->
    true

  save: (data) ->
    try
      key = @content_key(data['type'], data['id'])
      @client.set key, JSON.stringify(data)
      @emit 'success', data
    catch e
      @error e, "could not set #{data['type']} #{data['id']}", 'Data.save'

  delete: (type='events', id) ->
    try
      key = @content_key(data['type'], data['id'])
      @client.del key
      @emit 'success', type, id
    catch e
      @error e, "could not delete #{type} #{id}", 'Data.delete'

module.exports = Data
