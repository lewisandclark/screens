(function() {
  var Controller, Views;
  $(document).ready(function() {
    var controller, socket, views;
    $("#guide").fadeIn(750);
    socket = io.connect(window.location);
    views = new Views();
    controller = new Controller(socket, views);
    document.signage = {
      views: views,
      controller: controller
    };
    socket.on('screen', function(data) {
      return document.signage.controller.set_screen(data);
    });
    socket.on('update', function(data) {
      return document.signage.controller.update(data);
    });
    socket.on('remove', function(data) {
      return document.signage.controller.remove(data['key']);
    });
    socket.on('empty', function(data) {
      console.log('empty received');
      return console.log(data);
    });
    socket.on('error', function(data) {
      console.log('error received');
      return console.log(data);
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
      this.screen = '';
      this.position = 0;
      this.interval = null;
      this.seconds = 5;
    }
    Controller.prototype.running = function() {
      if (this.interval != null) {
        return true;
      }
      return false;
    };
    Controller.prototype.set_screen = function(screen) {
      this.screen = screen;
      return this.buffer();
    };
    Controller.prototype.has = function(key) {
      var index, queued, _len, _ref;
      _ref = this.queue;
      for (index = 0, _len = _ref.length; index < _len; index++) {
        queued = _ref[index];
        if (key === queued['key']) {
          return index;
        }
      }
      return null;
    };
    Controller.prototype.date = function(value) {
      return new Date(Date.parse(value));
    };
    Controller.prototype.datify = function(item) {
      var property, value;
      for (property in item) {
        value = item[property];
        if (typeof value === 'string' && value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/)) {
          item[property] = this.date(value);
        }
      }
      return item;
    };
    Controller.prototype.qrcodify = function(key, link) {
      var object;
      object = this;
      return $.ajax({
        url: 'http://api.bitly.com/v3/shorten?login=lcweblab&apiKey=R_6b2425f485649afae898025bcd17458d&longUrl=' + encodeURI(link) + '&format=json',
        method: 'GET',
        dataType: 'json',
        success: function(data, textStatus, jqXHR) {
          var index;
          if ((data != null) && (data.data != null) && (data.data.url != null)) {
            index = object.has(key);
            if (index != null) {
              return object.queue[index]['item']['qrcode'] = data.data.url;
            }
          }
        },
        error: function(jqXHR, textStatus, errorThrown) {
          return null;
        }
      });
    };
    Controller.prototype.is_live = function(item) {
      if (item['status'] === 1) {
        return true;
      }
      return false;
    };
    Controller.prototype.insert_index = function(data) {
      var index, queued, _len, _ref;
      if (this.queue.length === 0) {
        return 0;
      }
      _ref = this.queue;
      for (index = 0, _len = _ref.length; index < _len; index++) {
        queued = _ref[index];
        if (data['item']['start_time'].getTime() < queued['item']['start_time'].getTime()) {
          return index;
        }
      }
      if (this.queue.length < this.buffer_size) {
        return this.queue.length;
      }
      return null;
    };
    Controller.prototype.update = function(data) {
      var exists, index;
      try {
        data['item'] = JSON.parse(data['item']);
        data['item'] = this.datify(data['item']);
        exists = this.has(data['key']);
        if (exists != null) {
          this.queue[exists] = data;
        } else if (this.is_live(data['item'])) {
          index = this.insert_index(data);
          if (index != null) {
            this.queue.splice(index, 0, data);
            if (this.position > index) {
              this.position += 1;
            }
          }
        }
        this.qrcodify(data['key'], data['item']['link']);
        if (!this.running()) {
          return this.begin();
        }
      } catch (e) {
        return console.log(e);
      }
    };
    Controller.prototype.remove = function(key) {
      var index;
      index = this.has(key);
      if (index != null) {
        this.queue.splice(index, 1);
        return this.buffer();
      }
    };
    Controller.prototype.buffer = function() {
      if (this.queue.length >= this.buffer_size) {
        return;
      }
      return this.socket.emit('items', {
        count: this.buffer_size - this.queue.length
      });
    };
    Controller.prototype.begin = function() {
      $("#guide").fadeOut(750);
      this.render();
      return this.interval = setInterval("document.signage.controller.next()", this.seconds * 1000);
    };
    Controller.prototype.next = function() {
      if (this.position === -1) {
        $("#guide").fadeOut(750);
      }
      this.position += 1;
      if (this.position >= this.queue.length) {
        return this.reset();
      } else {
        return this.render();
      }
    };
    Controller.prototype.reset = function() {
      var index, queued, removals, _i, _len, _results;
      $("#guide").fadeIn(750);
      $("#announcements").html('').css('left', 0);
      this.position = -1;
      removals = (function() {
        var _len, _ref, _results;
        _ref = this.queue;
        _results = [];
        for (index = 0, _len = _ref.length; index < _len; index++) {
          queued = _ref[index];
          _results.push(this.is_past(queued['item']) ? index : null);
        }
        return _results;
      }).call(this);
      _results = [];
      for (_i = 0, _len = removals.length; _i < _len; _i++) {
        index = removals[_i];
        _results.push(index != null ? this.queue.splice(index, 1) : void 0);
      }
      return _results;
    };
    Controller.prototype.is_all_day = function(item) {
      if (item['start_time'].getHours() !== 0 || item['start_time'].getMinutes() !== 0) {
        return false;
      }
      if (item['end_time'] === null) {
        return true;
      }
      if (item['end_time'].getHours() !== 0 || item['end_time'].getMinutes() !== 0) {
        return false;
      }
      return true;
    };
    Controller.prototype.is_past = function(item) {
      var d;
      d = new Date();
      if (item['start_time'].getTime() > d.getTime()) {
        return false;
      }
      if (this.is_all_day(item) && d.getHours() > 20) {
        return true;
      }
      if ((item['end_time'] != null) && d.getTime() > (item['start_time'].getTime() + (item['end_time'].getTime() - item['start_time'].getTime()) / 4)) {
        return true;
      }
      if (d.getTime() > (item['start_time'].getTime() + 900000)) {
        return true;
      }
      return false;
    };
    Controller.prototype.render = function() {
      this.views.render(this.position, this.queue[this.position]);
      return this.socket.emit('impression', {
        screen: this.screen,
        key: this.queue[this.position]['key']
      });
    };
    Controller.prototype.end = function() {
      return clearInterval(this.interval);
    };
    return Controller;
  })();
  Views = (function() {
    function Views() {
      this.screenWidth = $(window).width();
      this.screenHeight = $(window).height();
      this.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      this.months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
    }
    Views.prototype.pad = function(n) {
      if (n < 10) {
        return '0' + n;
      }
      return n;
    };
    Views.prototype.is_today = function(d) {
      var now;
      now = new Date();
      return this.is_this_week(d) && d.getDay() === now.getDay();
    };
    Views.prototype.is_tomorrow = function(d) {
      var now;
      now = new Date();
      return this.is_this_week(d) && ((d.getDay() - 1) === now.getDay() || (d.getDay() === 0 && now.getDay() === 6));
    };
    Views.prototype.is_this_week = function(d) {
      var now;
      now = new Date();
      return (d.getTime() - now.getTime()) < 604800000;
    };
    Views.prototype.day_css = function(d) {
      if (!this.is_this_week(d)) {
        return '';
      }
      if (this.is_today(d)) {
        return ' today';
      }
      if (this.is_tomorrow(d)) {
        return ' tomorrow';
      }
      return ' within-a-week';
    };
    Views.prototype.day_for = function(d) {
      if (this.is_today(d)) {
        return 'Today';
      }
      if (this.is_tomorrow(d)) {
        return 'Tomorrow';
      }
      if (this.is_this_week(d)) {
        return this.days[d.getDay()];
      }
      return "" + this.months[d.getMonth()] + " " + (d.getDate());
    };
    Views.prototype.format_time = function(d, meridian) {
      if (meridian == null) {
        meridian = true;
      }
      if (this.is_midnight(d)) {
        return "Midnight";
      }
      if (this.is_noon(d)) {
        return "Noon";
      }
      if (d.getHours() > 12) {
        return "" + (d.getHours() - 12) + ":" + (this.pad(d.getMinutes())) + (meridian ? ' p.m.' : '');
      }
      return "" + (d.getHours()) + ":" + (this.pad(d.getMinutes())) + (meridian ? ' a.m.' : '');
    };
    Views.prototype.is_midnight = function(d) {
      return d.getHours() === 0 && d.getMinutes() === 0;
    };
    Views.prototype.is_noon = function(d) {
      return d.getHours() === 12 && d.getMinutes() === 0;
    };
    Views.prototype.time_for = function(item) {
      if (item['end_time'] != null) {
        if (this.is_midnight(item['start_time']) && this.is_midnight(item['end_time']) && (item['start_time'].getDay() === item['end_time'].getDay() || item['start_time'].getDay() + 1 === item['end_time'].getDay())) {
          return 'All Day';
        } else if (item['start_time'].getDay() === item['end_time'].getDay()) {
          if (item['start_time'].getHours() < 12 && item['end_time'].getHours() > 12) {
            return "" + (this.format_time(item['start_time'])) + " &ndash; " + (this.format_time(item['end_time']));
          } else {
            return "" + (this.format_time(item['start_time'], false)) + "&ndash;" + (this.format_time(item['end_time']));
          }
        } else {
          return "" + (this.format_time(item['start_time'])) + " &ndash; " + (this.format_time(item['end_time']));
        }
      } else {
        if (this.is_midnight(item['start_time'])) {
          return 'All Day';
        }
        return this.format_time(item['start_time']);
      }
    };
    Views.prototype.render = function(position, data) {
      var item, key, output;
      key = data['key'].replace(/:/, '_');
      item = data['item'];
      output = '\
    <article id="' + key + '" style="opacity: 0;left:' + (this.screenWidth * (position + 1) + 18) + 'px;width: ' + (this.screenWidth - 36) + 'px;height: ' + (this.screenHeight - 36) + 'px;">\
      ' + ((item['images'] != null) && (item['images'][0] != null) ? '<img src="' + item['images'][0].url + '" alt="' + item['images'][0].alt + '" />' : '') + '\
      <div>\
        <h2 class="when' + this.day_css(item['start_time']) + '">\
          <span class="day">' + this.day_for(item['start_time']) + '</span>\
          <span class="time">' + this.time_for(item) + '</span>\
        </h2>\
        <h3 class="what">\
          <span class="title">' + item['title'] + '</span>\
        </h3>\
        <h4 class="where">\
          <span class="location">' + item['location'] + '</span>\
        </h4>\
        <p class="extra-details">\
          ' + ((item['repeat'] != null) && (item['repeat']['next_start_time'] != null) ? '<span class="repeats_next">' + item['repeat']['next_start_time'] + '</span>' : '') + '\
        </p>\
        ' + ((item['summary'] != null) && item['summary'].length > 0 ? '<div class="about"><p>' + item['summary'].replace(/(<([^>]+)>)/ig, ' ') + '</p></div>' : '') + '\
        <h4 class="contact">\
          <span class="school">' + item['group']['school'] + '</span>\
          <span class="group">' + item['group']['name'] + '</span>\
          ' + '<span class="link">' + (item['qrcode'] != null ? item['qrcode'] : item['link']).replace(/^http(s?):\/\/(www)?\./i, '').replace(/\/(\d+)-?[a-z\-]+$/i, '/$1') + (item['qrcode'] != null ? '<img src="' + item['qrcode'] + '.qrcode" alt="QR Code" />' : '') + '</span>\
        </h4>\
      </div>\
    </article>';
      $("#announcements").append(output);
      $("#" + key).animate({
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
  
  LAUNCH
  
  1) up speed to 17 seconds
  
  2) Write static content
  
  3) set system to live
  
  
  TO DO - Short Term
  
  2) Make dashboard
  
  3) Hand push content to on.lclark.edu
  
  6) Handle Locations Better
  
  7) Show attendance tags
  
  8) insert messes up display? (one blank panel)
  
  9) Truncate summary.
  
  #) image height limit
  
  
  TO DO - Long Term
  
  1) filtering tests
    i) date change
    ii) authority relationship
    iii) live status change
    iv) parent filtering
    v) duplicate filtering
  
  2) Push needs to handle image-only changes
  
  3) Push needs to test if an update no longer matches the subscription, send is_removed
  
  */
}).call(this);
