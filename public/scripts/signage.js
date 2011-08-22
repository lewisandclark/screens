(function() {
  var Controller, Views;
  $(document).ready(function() {
    var controller, socket, views;
    socket = io.connect(window.location);
    views = new Views();
    controller = new Controller(socket, views);
    socket.on('channel', function(data) {
      return controller.set_channel(data['channel']);
    });
    socket.on('items', function(data) {
      var item, _i, _len, _ref, _results;
      console.log("items received");
      console.log(data);
      _ref = data['items'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        console.log(item);
        _results.push(controller.add(item));
      }
      return _results;
    });
    socket.on('update', function(data) {
      alert("item received");
      return controller.update(data['item']);
    });
    return socket.on('reload', function(data) {
      return window.location.reload();
    });
  });
  Controller = (function() {
    function Controller(socket, views) {
      this.socket = socket;
      this.views = views;
      this.queue = [];
      this.buffer_size = 30;
      this.channel = '';
      this.position = 0;
    }
    Controller.prototype.set_channel = function(channel) {
      this.channel = channel;
      return this.buffer();
    };
    Controller.prototype.has = function(item) {
      var queued, _i, _len, _ref;
      _ref = this.queue;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        queued = _ref[_i];
        if (item.key() === queued.key()) {
          return true;
        }
      }
    };
    Controller.prototype.add = function(item) {
      console.log(item);
      this.queue.push(item);
      if (this.queue.length === 1) {
        return this.next();
      }
    };
    Controller.prototype.remove = function() {
      return this.buffer();
    };
    Controller.prototype.buffer = function() {
      if (this.queue.length >= this.buffer_size) {
        return;
      }
      return this.socket.emit('items', {
        count: this.buffer_size - this.queue.length
      });
    };
    Controller.prototype.next = function() {
      this.position += 1;
      if (this.position >= this.queue.length) {
        return this.reset();
      } else {
        return this.views.render(this.position, this.queue[this.position]);
      }
    };
    Controller.prototype.reset = function() {
      $("#announcements").html('').css('left', 0);
      this.position = 0;
      return this.views.render(this.position, this.queue[this.position]);
    };
    return Controller;
  })();
  Views = (function() {
    function Views() {
      this.screenWidth = $(window).width();
      this.screenHeight = $(window).height();
    }
    Views.prototype.render = function(position, item) {
      var output, properties;
      properties = item['properties'];
      console.log(item['properties']);
      output = '\
    <article id="' + item['type'] + '_' + properties['id'] + '" style="opacity: 0;left:' + (this.screenWidth * position + 18) + 'px;width: ' + (this.screenWidth - 36) + 'px;height: ' + (this.screenHeight - 36) + 'px;">\
      ' + ((properties['images'] != null) && (properties['images'][0] != null) ? '<img src="' + properties['images'][0].url + '" alt="' + properties['images'][0].alt + '" />' : '') + '\
      <div>\
        <h3 class="what">\
          <span class="title">' + properties['title'] + '</span>\
        </h3>\
        <h4 class="where">\
          <span class="location">' + properties['location'] + '</span>\
        </h4>\
        <p class="extra-details">\
          ' + ((properties['repeat'] != null) && (properties['repeat']['next_start_time'] != null) ? '<span class="repeats_next">' + properties['repeat']['next_start_time'] + '</span>' : '') + '\
        </p>\
        ' + ((properties['summary'] != null) && properties['summary'].length > 0 ? '<div class="about"><p>' + properties['summary'].replace(/(<([^>]+)>)/ig, ' ') + '</p></div>' : '') + '\
        <h4 class="contact">\
          <span class="school">' + properties['group']['school'] + '</span>\
          <span class="group">' + properties['group']['name'] + '</span>\
          <span class="link">' + properties['link'].replace(/^http(s?):\/\/(www)?\./i, '').replace(/\/(\d+)-?[a-z\-]+$/i, '/$1') + '</span>\
        </h4>\
      </div>\
    </article>';
      $("#announcements").append(output);
      $("#" + item['type'] + '_' + properties['id']).animate({
        opacity: 1
      }, 1000).prev().animate({
        opacity: 0
      }, 500);
      return $("#announcements").animate({
        left: '-=' + this.screenWidth
      }, 1500, 'easeInOutBack');
    };
    return Views;
  })();
  /*
  
  1) need to accept update and:
    a) see if an item in the rotation needs updating
    b) if so, update and run filters
      i) date change
      ii) authority relationship
      iii) live status change
  
  2) need to request items for channel
    a) 
  
  # To Do:
  # need to test location? Push should handle this (before/after checking = is_removed)
  # need to test for parent in same channel
  
  # Improvements:
  # make all LW api calls from within the model
  # refactor db to be use a single function
  
  # Edge Cases:
  # subsequent update of a parent event (need to track children)
  
  */
}).call(this);
