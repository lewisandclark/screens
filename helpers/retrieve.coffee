
events = require 'events'

env = require __dirname + '/../config/env'

class Retrieve

  constructor: (socket) ->
    @error = require __dirname + '/error'
    db = require __dirname + '/db'
    @db = new db
    @socket = socket
    @screen = @set_screen()
    @socket.emit('screen', @screen) if @screen? 

  @['prototype'] = new events.EventEmitter

  set_screen: () ->
    address = @socket.handshake.address.address
    return null if address is null
    for name, screen of env.screens
      return screen if screen['ip'] is address
    null

  get_lead_member: (count) ->
    object = @
    if @db.listeners('get_from_sorted_set_success').length is 0
      @db.on 'get_from_sorted_set_success',
        (members, key) ->
          if members? and members.length > 0
            object.get_starting_index members, count
          else
            object.socket.emit 'empty', { channel: object.screen['channel'] }
    @db.get_from_sorted_set("timeline:#{@screen['channel']}", (new Date()).getTime(), "+inf")
    
  get_starting_index: (members, count) ->
    object = @
    if @db.listeners('get_index_of_sorted_set_item_success').length is 0
      @db.on 'get_index_of_sorted_set_item_success',
        (index, key) ->
          if index? and index >= 0
            object.get_items index, count
          else
            object.socket.emit 'error', { error: "could not get index for lead member", method: "Retrieve.get_items" }
    @db.get_index_of_sorted_set_item("timeline:#{@screen['channel']}", members[0])

  get_items: (index, count) ->
    object = @
    if @db.listeners('get_from_sorted_set_by_index_success').length is 0
      @db.on 'get_from_sorted_set_by_index_success',
        (members, key) ->
          if members? and members.length > 0
            object.push members
          else
            object.socket.emit 'error', { error: "could not get index ", method: "Retrieve.get_items" }
    @db.get_from_sorted_set_by_index("timeline:#{@screen['channel']}", index, (index + count))
  
  push: (members) ->
    object = @
    if @db.listeners('get_success').length is 0
      @db.on 'get_success',
        (item, key) ->
          console.log "sending #{key} > #{object.screen['name']}"
          object.socket.emit 'update', { key: key, item: item }
    for member in members
      @db.get member


module.exports = Retrieve
