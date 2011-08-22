
events = require 'events'

env = require __dirname + '/../config/env'

class Retrieve

  constructor: (socket) ->
    @socket = socket
    @error = require __dirname + '/error'
    db = require __dirname + '/db'
    @db = new db

  @['prototype'] = new events.EventEmitter

  set_channel: () ->
    channel = 'undergraduate'
    object = @
    @socket.set 'channel', channel,
      () ->
        object.socket.emit 'channel', { channel: channel }

  get_channel: (count) ->
    object = @
    @socket.get 'channel',
      (e, channel) ->
        if e?
          object.error e, "unable to retrieve channel for socket", 'Retrieve.retrieve_items.socket'
          object.socket.emit 'error', { error: "could not get channel from socket", method: "Retrieve.get_channel" }
        else
          object.get_lead_member channel, count

  get_lead_member: (channel, count) ->
    object = @
    @db.on 'get_from_sorted_set_success',
      (members, key) ->
        if members? and members.length > 0
          object.get_starting_index channel, members, count
        else
          object.socket.emit 'empty', { channel: channel }
    @db.get_from_sorted_set("timeline:#{channel}", (new Date()).getTime(), "+inf")
    
  get_starting_index: (channel, members, count) ->
    object = @
    @db.on 'get_index_of_sorted_set_item_success',
      (index, key) ->
        if index? and index >= 0
          object.get_items channel, index, count
        else
          object.socket.emit 'error', { error: "could not get index for lead member", method: "Retrieve.get_items" }
    @db.get_index_of_sorted_set_item("timeline:#{channel}", members[0])

  get_items: (channel, index, count) ->
    object = @
    @db.on 'get_from_sorted_set_by_index_success',
      (members, key) ->
        if members? and members.length > 0
          object.push members
        else
          object.socket.emit 'error', { error: "could not get index ", method: "Retrieve.get_items" }
    @db.get_from_sorted_set_by_index("timeline:#{channel}", index, (index + count))
  
  push: (members) ->
    object = @
    @db.on 'get_success',
      (item, key) ->
        object.socket.volatile.emit 'update', { key: key, item: item }
    for member in members
      @db.get member


module.exports = Retrieve
