
events = require 'events'
https = require 'https'

env = require __dirname + '/../config/env'

class Filter

  constructor: () ->
    @error = require __dirname + '/error'
    @livewhale = require __dirname + '/livewhale'
    @data = require __dirname + '/data'

  @['prototype'] = new events.EventEmitter

  process: (update={}) ->
    object = @
    if update['is_deleted']
      data = new @data
      data.on 'success',
        (type='events', id=0) ->
          console.log "#{type} #{id} was deleted"
      data.delete update['object'], update['object_id']
    else
      livewhale = new @livewhale_api
      livewhale.on 'success',
        (parsed) ->
          data = new object.data
          data.on 'success',
            (stored_data) ->
              console.log "SAVED"
              console.log stored_data
          data.save parsed
      livewhale.collect update['object'], update['object_id']
    true

  # need to test location? Push should handle this
  # need to pass status, scheduled and archive/expiration to handle live status

  # need to apply channel filter (store in env)
  # need to test for parent in same channel
  # need to store key groups which predominate

  # need to have live test in clients

module.exports = Filter
