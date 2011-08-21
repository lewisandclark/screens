
events = require 'events'
https = require 'https'

env = require __dirname + '/../config/env'
livewhale_event = require __dirname + '/../models/livewhale_event'

class LiveWhaleAPI

  constructor: () ->
    @error = require __dirname + '/error'

  @['prototype'] = new events.EventEmitter

  collect: (type='events', id, child=null) ->
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
          #try
            parsed = JSON.parse data
            item = new livewhale_event parsed, child
            item.save()
            object.emit('success', item) if object['_events']? and object['_events']['success']?
          #catch e
            #object.error e, 'parse error', 'LiveWhaleAPI.collect.https'
    req.on 'error',
      (e) ->
        object.error e, 'request error', 'LiveWhaleAPI.collect.https'
    true

module.exports = LiveWhaleAPI
