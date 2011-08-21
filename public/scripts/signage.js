(function() {
  var DisplayManager, ListManager, socket;
  socket = io.connect(window.location);
  socket.on('update', function(data) {
    return alert(data['item']);
  });
  socket.on('connect', list_manager.get_new_items());
  ListManager = (function() {
    function ListManager(channel) {
      this.queue = [];
      this.buffer_size = 30;
      this.channel = channel;
      this.position = 0;
    }
    ListManager.prototype.has = function(item) {
      var queued, _i, _len;
      for (_i = 0, _len = queue.length; _i < _len; _i++) {
        queued = queue[_i];
        if (item.key() === queued.key()) {
          return true;
        }
      }
    };
    ListManager.prototype.add = function(item) {
      return queue.push(item);
    };
    ListManager.prototype.buffer = function() {
      if (this.queue.length >= this.buffer_size) {
        return;
      }
      return socket.emit('request_items', {
        channel: this.channel,
        count: this.buffer_size - this.queue.length
      });
    };
    ListManager.prototype.next = function(position) {
      if (position == null) {
        position = this.position;
      }
      position += 1;
      if (position >= this.queue.length) {
        return position = 0;
      }
    };
    return ListManager;
  })();
  DisplayManager = (function() {
    function DisplayManager() {}
    return DisplayManager;
  })();
  /*
  
  1) need to accept update and:
    a) see if an item in the rotation needs updating
    b) if so, update and run filters
      i) date change
      ii) authority relationship
      iii) 
  
  2) need to request items for channel
    a) 
  
  */
}).call(this);
