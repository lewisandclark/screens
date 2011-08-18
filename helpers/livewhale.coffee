
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
      host: env.hosts.livewhale
      path: "#{env.livewhale_api_path}/#{type}/#{id}.json"
    object = @
    req = https.get options,
      (res) ->
        data = ''
        res.on 'data', (chunk) ->
          data += chunk
        res.on 'end', () ->
          try
            parsed = JSON.parse data
            parsed['type'] = type
            object.emit 'success', parsed
          catch e
            object.error e, 'parse error', 'LiveWhaleAPI.collect.https'
    req.on 'error',
      (e) ->
        object.error e, 'request error', 'LiveWhaleAPI.collect.https'
    true

  is_live: (update) ->
    return true if update['status'] is 1
    return true if update['type'] is 'news' and update['golive'] > new Date() and update['expiration'] > update['golive']
    false

  has_parent: (update) ->
    return true if update['parent_id']?
    false

module.exports = LiveWhaleAPI
