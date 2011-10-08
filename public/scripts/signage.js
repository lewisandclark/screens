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
    socket.on('speed', function(data) {
      return document.signage.controller.set_speed(data);
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
      this.min_buffer_size = 10;
      this.max_buffer_size = 20;
      this.range = 12 * 24 * 60 * 60 * 1000;
      this.screen = {};
      this.position = 0;
      this.additions = [];
      this.removals = [];
      this.interval = null;
      this.timeout = null;
      this.seconds = (window.location.href.match(/\:3000/) ? 2 : 9);
      this.blocked = false;
    }
    Controller.prototype.running = function() {
      if (this.interval != null) {
        return true;
      }
      return false;
    };
    Controller.prototype.waiting = function() {
      if (this.timeout != null) {
        return true;
      }
      return false;
    };
    Controller.prototype.set_screen = function(screen) {
      this.screen = screen;
      return this.buffer();
    };
    Controller.prototype.set_speed = function(data) {
      var seconds;
      seconds = parseInt(data['seconds']);
      if (!isNaN(seconds)) {
        this.seconds = seconds;
        clearInterval(this.interval);
        return this.interval = setInterval("document.signage.controller.next()", this.seconds * 1000);
      }
    };
    Controller.prototype.stop = function() {
      return clearInterval(this.interval);
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
          } else if ((data != null) && (data.status_code != null) && (data.status_txt != null)) {
            return object.socket.emit('error', {
              screen: object.screen,
              error: "qrcodify.ajax.error: " + data.status_code + " " + data.status_txt
            });
          }
        },
        error: function(jqXHR, textStatus, errorThrown) {
          return object.socket.emit('error', {
            screen: object.screen,
            error: "qrcodify.ajax.error: " + textStatus + " " + errorThrown
          });
        }
      });
    };
    Controller.prototype.is_live = function(item) {
      if (item['status'] === 1) {
        return true;
      }
      return false;
    };
    Controller.prototype.has_matching_channel = function(item) {
      if (!(item['channels'] != null)) {
        return true;
      }
      if (item['channels'].indexOf(this.screen['channel']) >= 0) {
        return true;
      }
      return false;
    };
    Controller.prototype.is_in_range = function(item) {
      var d;
      d = new Date();
      if (item['start_time'].getTime() < d.getTime() + this.range) {
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
      if (this.queue.length < this.max_buffer_size) {
        return this.queue.length;
      }
      return null;
    };
    Controller.prototype.update = function(data) {
      var exists;
      try {
        data['item'] = JSON.parse(data['item']);
        data['item'] = this.datify(data['item']);
        exists = this.has(data['key']);
        if (exists != null) {
          this.queue[exists] = data;
          if (!(data['item']['qrcode'] != null)) {
            this.qrcodify(data['key'], data['item']['link']);
          }
        } else if (this.is_live(data['item']) && this.has_matching_channel(data['item']) && this.is_in_range(data['item'])) {
          if (!this.running()) {
            this.queue.push(data);
            if (!(data['item']['qrcode'] != null)) {
              this.qrcodify(data['key'], data['item']['link']);
            }
          } else {
            this.additions.push(data);
          }
        }
        if (!this.running() && !this.waiting()) {
          return this.timeout = setTimeout("document.signage.controller.begin()", this.seconds * 1000);
        }
      } catch (e) {
        return console.log(e);
      }
    };
    Controller.prototype.remove = function(key) {
      return this.removals.push(key);
    };
    Controller.prototype.buffer = function() {
      if (this.queue.length >= this.max_buffer_size) {
        return;
      }
      return this.socket.emit('items', {
        count: this.max_buffer_size - this.queue.length
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
    Controller.prototype.refresh_queue = function() {
      var addition, i, index, key, new_queue, _i, _j, _len, _len2, _ref, _ref2, _ref3, _ref4;
      if (this.additions.length > 0 || this.removals.length > 0) {
        this.blocked = true;
        if (this.removals.length > 0) {
          new_queue = [];
          this.socket.emit('log', {
            screen: this.screen,
            log: "refresh_queue: removals length " + this.removals.length
          });
          _ref = this.removals;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            key = _ref[_i];
            index = this.has(key);
            if (index != null) {
              for (i = 0, _ref2 = this.queue.length - 1; 0 <= _ref2 ? i <= _ref2 : i >= _ref2; 0 <= _ref2 ? i++ : i--) {
                if (i !== index) {
                  new_queue.push($.extend({}, item[i]));
                }
              }
            }
          }
          this.queue = $.extend(true, [], new_queue);
          this.removals = [];
        }
        if (this.additions.length > 0) {
          new_queue = [];
          this.socket.emit('log', {
            screen: this.screen,
            log: "refresh_queue: additions length " + this.additions.length
          });
          _ref3 = this.additions;
          for (_j = 0, _len2 = _ref3.length; _j < _len2; _j++) {
            addition = _ref3[_j];
            index = this.insert_index(addition);
            if (index != null) {
              for (i = 0, _ref4 = this.queue.length; 0 <= _ref4 ? i <= _ref4 : i >= _ref4; 0 <= _ref4 ? i++ : i--) {
                if (i < index) {
                  new_queue.push($.extend({}, item[i]));
                } else if (i === index) {
                  new_queue.push(addition);
                } else {
                  new_queue.push($.extend({}, item[i - 1]));
                }
              }
              if (!(addition['item']['qrcode'] != null)) {
                this.qrcodify(addition['key'], addition['item']['link']);
              }
            }
          }
          this.queue = $.extend(true, [], new_queue);
          this.additions = [];
        }
        return this.blocked = false;
      }
    };
    Controller.prototype.reset = function() {
      var addition, exists, index, key, queued, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
      $("#guide").fadeIn(750);
      $("#announcements").html('').css('left', 0);
      this.position = -1;
      _ref = this.additions;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        addition = _ref[_i];
        exists = this.has(addition['key']);
        if (exists === null) {
          index = this.insert_index(addition);
          if (index != null) {
            this.queue.splice(index, 0, addition);
            if (!(addition['item']['qrcode'] != null)) {
              this.qrcodify(addition['key'], addition['item']['link']);
            }
          }
        }
      }
      this.additions = [];
      _ref2 = this.queue;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        queued = _ref2[_j];
        if (this.is_past(queued['item'])) {
          this.removals.push(queued['key']);
        }
        if (!this.is_in_range(queued['item'])) {
          this.removals.push(queued['key']);
        }
      }
      _ref3 = this.removals;
      for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
        key = _ref3[_k];
        index = this.has(key);
        if (index != null) {
          this.queue.splice(index, 1);
        }
      }
      if (this.removals.length > 0 || this.queue.length < this.min_buffer_size) {
        this.buffer();
      }
      return this.removals = [];
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
      return (d.getTime() - now.getTime()) < (6 * 24 * 60 * 60 * 1000);
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
      if (d.getHours() === 12) {
        return "" + (d.getHours()) + ":" + (this.pad(d.getMinutes())) + (meridian ? ' p.m.' : '');
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
    Views.prototype.location_for = function(item) {
      return item['location'];
    };
    Views.prototype.has_summary = function(item) {
      var summary;
      summary = this.summary_for(item);
      return (summary != null) && (summary.length != null) && summary.length > 0;
    };
    Views.prototype.summary_for = function(item) {
      var summary;
      summary = item['summary'].replace(/(<([^>]+)>)/ig, ' ').replace('&#160;', ' ').replace(/^\s+|\s+$/, '').replace(/\s+/, ' ');
      if (summary.length > 290) {
        return "" + (summary.substr(0, summary.lastIndexOf(' ', 290))) + " &hellip;";
      }
      return summary;
    };
    Views.prototype.render = function(position, data) {
      var item, key, output, screenHeight, screenWidth;
      key = data['key'].replace(/:/, '_');
      item = data['item'];
      screenWidth = $(window).width();
      screenHeight = $(window).height();
      output = '\
    <article id="' + key + '" style="opacity: 0;left:' + (screenWidth * (position + 1) + 18) + 'px;width: ' + (screenWidth - 36) + 'px;height: ' + (screenHeight - 36) + 'px;">\
      ' + ((item['images'] != null) && (item['images'][0] != null) ? '<img src="' + item['images'][0].url + '" alt="' + item['images'][0].alt + '" />' : '') + '\
      <div>\
        <h2 class="when' + this.day_css(item['start_time']) + '">\
          <span class="day">' + this.day_for(item['start_time']) + '</span>\
          <span class="time">' + this.time_for(item) + '</span>\
        </h2>\
        <h3 class="what">\
          <span class="title">' + item['title'] + '</span>\
        </h3>\
        ' + (this.location_for(item) != null ? '<h4 class="where"><span class="location">' + this.location_for(item) + '</span></h4>' : '') + '\
        <p class="extra-details">\
          ' + ((item['repeat'] != null) && (item['repeat']['next_start_time'] != null) ? '<span class="repeats_next">' + item['repeat']['next_start_time'] + '</span>' : '') + '\
        </p>\
        ' + (this.has_summary(item) ? '<div class="about"><p>' + this.summary_for(item) + '</p></div>' : '') + '\
        <h4 class="contact">\
          <span class="school">' + item['group']['school'] + '</span>\
          <span class="group">' + item['group']['name'] + '</span>\
          ' + '<span class="link">' + (item['qrcode'] != null ? item['qrcode'].replace(/\.qrcode$/, '') : item['link']).replace(/^http(s?):\/\/(www)?\./i, '').replace(/\/(\d+)-?[a-z\-]+$/i, '/$1') + (item['qrcode'] != null ? '<img src="' + (item['qrcode'].match(/\.qrcode$/) ? item['qrcode'] : "" + item['qrcode'] + ".qrcode") + '" alt="QR Code" />' : '') + '</span>\
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
        left: '-=' + screenWidth
      }, 1500, 'easeInOutBack');
    };
    return Views;
  })();
  /*
  
  TO DO - Short Term
  
  6) Handle Locations Better
  
  7) Show attendance tags
  
  #) image height limit
  
  #) switching time with title
  
  #) kill interval before reload
  
  #) lowercase titles if uppercase
  
  
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
