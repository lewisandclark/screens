
events = require 'events'
https = require 'https'

env = require __dirname + '/../config/env'

class LiveWhaleAPI

  constructor: () ->
    @error = require __dirname + '/error'

  @['prototype'] = new events.EventEmitter

  collect: (type='events', id) ->
    if id is null or id <= 0
      object.error 'error', "id is not valid: #{id}", 'LiveWhaleAPI.collect'
    options =
      host: env.livewhale.host
      path: "#{env.livewhale.path}/#{type}/#{id}.json"
    object = @
    req = https.get options,
      (res) ->
        data = ''
        res.on 'data', (chunk) ->
          data += chunk
        res.on 'end', () ->
          try
            parsed = JSON.parse data
            object.emit('success', type, parsed) if object['_events']? and object['_events']['success']?
          catch e
            object.error e, 'parse error', 'LiveWhaleAPI.collect.https'
    req.on 'error',
      (e) ->
        object.error e, 'request error', 'LiveWhaleAPI.collect.https'
    req.socket.setTimeout env.livewhale.timeout
    true

module.exports = LiveWhaleAPI
