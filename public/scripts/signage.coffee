
socket = io.connect window.location

socket.on 'update',
  (data) ->
    alert data['item']

socket.on 'connect',
  list_manager.get_new_items()    


class ListManager

  constructor: (channel) ->
    @queue = []
    @buffer_size = 30
    @channel = channel
    @position = 0
  
  has: (item) ->
    for queued in queue
      return true if item.key() is queued.key()

  add: (item) ->
    queue.push item   # need to insert into queue by time

  buffer: () ->
    return if @queue.length >= @buffer_size
    socket.emit 'request_items', { channel: @channel, count: (@buffer_size - @queue.length) }

  next: (position=@position) ->
    position += 1
    position = 0 if position >= @queue.length


class DisplayManager

  constructor: () ->


###

1) need to accept update and:
  a) see if an item in the rotation needs updating
  b) if so, update and run filters
    i) date change
    ii) authority relationship
    iii) 

2) need to request items for channel
  a) 

###
