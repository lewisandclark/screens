
$(document).ready ->

  socket = io.connect 'http://on.lclark.edu:3000'

  socket.on 'update',
    (data) ->
      alert data['item']['something']

  request_items = (offset, limit) ->
    socket.emit 'request_items', {  }


