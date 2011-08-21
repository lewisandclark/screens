(function() {
  $(document).ready(function() {
    var request_items, socket;
    socket = io.connect('http://on.lclark.edu:3000');
    socket.on('update', function(data) {
      return alert(data['item']['something']);
    });
    return request_items = function(offset, limit) {
      return socket.emit('request_items', {});
    };
  });
}).call(this);
