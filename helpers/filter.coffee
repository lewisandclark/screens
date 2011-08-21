
events = require 'events'

env = require __dirname + '/../config/env'
app = require __dirname + '/../config/app'
io = require('socket.io').listen app
livewhale_event = require __dirname + '/../models/livewhale_event'

class Filter

  constructor: () ->
    @error = require __dirname + '/error'
    @livewhale_api = require __dirname + '/livewhale_api'

  @['prototype'] = new events.EventEmitter

  process: (update={}) ->
    object = @
    if update['is_deleted'] or update['is_removed']
      livewhale_event.delete update['object_id']
    else
      livewhale_api = new @livewhale_api
      livewhale_api.collect update['object'], update['object_id']
      @update({ something: 'test' })
    true

  update: (item) ->
    io.sockets.emit 'update', { item: item }

  remove: (type='events', id) ->
    # app.io.sockets.emit 'removed', { type: type, id: id }

  

  # To Do:
  # need to test location? Push should handle this (before/after checking = is_removed)
  # need to test for parent in same channel

  # Improvements:
  # make all LW api calls from within the model
  # refactor db to be use a single function

  # Edge Cases:
  # subsequent update of a parent event (need to track children)

module.exports = Filter
