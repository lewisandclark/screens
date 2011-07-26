(function() {
  $(document).ready(function() {
    var alertLogMessages, buffer, bufferTime, buffering, cssForDay, days, errorMax, formatDay, formatTime, formatTimeFor, fromISO8601, getShortenedLinkFor, isThisWeek, isToday, isTomorrow, log, monthsAbbreviated, pad, queue, queueUp, requiredEventFields, requiredFields, runTime, running, screenHeight, screenWidth, sendToDisplay, shown, startBuffering, startDisplaying, stopAfter, toISO8601, validated, withImagesOnly;
    queue = [];
    running = null;
    buffering = null;
    runTime = 10000;
    bufferTime = 60000;
    errorMax = 3;
    withImagesOnly = false;
    stopAfter = 50;
    screenWidth = $(window).width();
    screenHeight = $(window).height();
    shown = 0;
    alertLogMessages = false;
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    monthsAbbreviated = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
    jQuery.timeago.settings.strings = {
      prefixAgo: 'updated ',
      prefixFromNow: null,
      suffixAgo: "ago",
      suffixFromNow: "from now",
      seconds: "less than a minute",
      minute: "about a minute",
      minutes: "%d minutes",
      hour: "about an hour",
      hours: "about %d hours",
      day: "a day",
      days: "%d days",
      month: "about a month",
      months: "%d months",
      year: "about a year",
      years: "%d years",
      numbers: []
    };
    requiredFields = ['id', 'updated_at', 'title', 'summary', 'group', 'link'];
    requiredEventFields = ['start_time', 'location'];
    log = function(message) {
      if (typeof console !== 'undefined') {
        console.log(message);
      }
      if (alertLogMessages) {
        return alert(message);
      }
    };
    pad = function(n) {
      if (n < 10) {
        return '0' + n;
      }
      return n;
    };
    fromISO8601 = function(s) {
      var d, minutesOffset, struct;
      d = new Date(s);
      if (isNaN(d)) {
        minutesOffset = 0;
        struct = /^(\d{4}|[+\-]\d{6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?))?/.exec(s);
        if (struct[8] !== 'Z') {
          minutesOffset = (+struct[10]) * 60 + (+struct[11]);
          if (struct[9] === '+') {
            minutesOffset = 0 - minutesOffset;
          }
        }
        d = Date.UTC(+struct[1], +struct[2] - 1, +struct[3], +struct[4], +struct[5] + minutesOffset, +struct[6], (typeof struct[7] === 'undefined' ? 0 : +struct[7].substr(0, 3)));
        if (typeof d === 'number') {
          d = new Date(d);
        }
      }
      return d;
    };
    toISO8601 = function(d) {
      return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
    };
    validated = function(item, kind) {
      var i, now;
      if (item == null) {
        item = null;
      }
      if (kind == null) {
        kind = 'event';
      }
      if (item === null) {
        return null;
      }
      for (i in requiredFields) {
        if (typeof item[i] === void 0 || item[i] === null) {
          return null;
        }
      }
      if (kind === 'event') {
        for (i in requiredEventFields) {
          if (typeof item[i] === void 0 || item[i] === null) {
            return null;
          }
        }
      }
      now = new Date();
      for (i in item) {
        switch (i) {
          case 'id':
            item[i] = parseInt(item[i]);
            break;
          case 'start_time':
          case 'end_time':
          case 'updated_at':
            item[i] = fromISO8601(item[i]);
            if (i === 'start_time' && item[i].getTime() < now.getTime()) {
              return null;
            }
            break;
          case 'group':
          case 'author':
            item[i].id = parseInt(item[i].id);
            break;
          case 'repeats':
            if (item[i] === !null && item[i].repeats_until === !null) {
              item[i].repeats_until = fromISO8601(item[i].repeats_until);
            }
        }
      }
      return item;
    };
    queueUp = function(item) {
      var i;
      if (item == null) {
        item = null;
      }
      if (item === null) {
        return false;
      }
      if (withImagesOnly && (!(item.images != null) || !(item.images[0] != null))) {
        return false;
      }
      log('inserting/updating item in queue');
      log(item);
      for (i in queue) {
        if (queue[i].id === item.id) {
          queue[i] = item;
          return true;
        }
      }
      queue.push(item);
      return true;
    };
    getShortenedLinkFor = function(item) {
      if (item == null) {
        item = null;
      }
      if (item === null) {
        return false;
      }
      $.ajax({
        url: 'http://api.bitly.com/v3/shorten?login=lcweblab&apiKey=R_6b2425f485649afae898025bcd17458d&longUrl=' + encodeURI(item.link) + '&format=json',
        method: 'GET',
        dataType: 'json',
        success: function(data, textStatus, jqXHR) {
          log('received data from bit.ly');
          log(data);
          if ((data != null) && (data.data != null) && (data.data.url != null)) {
            return $('article#' + item.id).find('.link').html(data.data.url + '<img src="' + data.data.url + '.qrcode" alt="QR Code" />');
          }
        },
        error: function(jqXHR, textStatus, errorThrown) {
          return log("received error from bit.ly " + textStatus);
        }
      });
      return null;
    };
    isThisWeek = function(d) {
      var now;
      now = new Date();
      log(d.getTime());
      log(now.getTime());
      log(d.getTime() - now.getTime());
      return (d.getTime() - now.getTime()) < 604800000;
    };
    isToday = function(d) {
      var now;
      now = new Date();
      return isThisWeek(d) && d.getDay() === now.getDay();
    };
    isTomorrow = function(d) {
      var now;
      now = new Date();
      return isThisWeek(d) && ((d.getDay() - 1) === now.getDay() || (d.getDay() === 0 && now.getDay() === 6));
    };
    cssForDay = function(d) {
      if (!isThisWeek(d)) {
        return '';
      }
      if (isToday(d)) {
        return ' today';
      }
      if (isTomorrow(d)) {
        return ' tomorrow';
      }
      return ' within-a-week';
    };
    formatDay = function(d) {
      if (isToday(d)) {
        return 'Today';
      }
      if (isTomorrow(d)) {
        return 'Tomorrow';
      }
      if (isThisWeek(d)) {
        return days[d.getDay()];
      }
      return "" + monthsAbbreviated[d.getMonth()] + " " + (d.getDate());
    };
    formatTime = function(d, meridian) {
      if (meridian == null) {
        meridian = true;
      }
      if (d.getHours() > 12) {
        return "" + (d.getHours() - 12) + ":" + (pad(d.getMinutes())) + (meridian ? ' p.m.' : void 0);
      } else {
        return "" + (d.getHours()) + ":" + (pad(d.getMinutes())) + (meridian ? ' a.m.' : void 0);
      }
    };
    formatTimeFor = function(item) {
      if (item == null) {
        item = null;
      }
      if (item === null) {
        return '';
      }
      if (typeof end_time !== "undefined" && end_time !== null) {
        if (item.start_time.getDay() === item.end_time.getDay()) {
          if (item.start_time.getHours() < 12 && item.end_time.getHours() > 12) {
            return "" + (formatTime(item.start_time)) + " &ndash; " + (formatTime(item.end_time));
          } else {
            return "" + (formatTime(item.start_time, false)) + "&ndash;" + (formatTime(item.end_time));
          }
        } else {
          return "" + (formatTime(item.start_time)) + " &ndash; " + (formatTime(item.end_time));
        }
      } else {
        if (item.start_time.getHours() === 0 && item.start_time.getMinutes() === 0) {
          return 'All Day';
        }
        return formatTime(item.start_time);
      }
    };
    sendToDisplay = function() {
      var item, output;
      if (queue.length === 0) {
        return null;
      }
      if (queue.length < 3) {
        buffer();
      }
      stopAfter -= 1;
      if (stopAfter < 0) {
        clearInterval(running);
        clearInterval(buffering);
        log('stopping');
        return null;
      }
      item = queue.shift();
      shown += 1;
      log('generating output');
      output = '\
    <article id="' + item.id + '" style="opacity: 0;left:' + (screenWidth * shown + 18) + 'px;width: ' + (screenWidth - 36) + 'px;height: ' + (screenHeight - 36) + 'px;">\
      ' + ((item.images != null) && (item.images[0] != null) ? '<img src="' + item.images[0].url + '" alt="' + item.images[0].alt + '" />' : '') + '\
      <div>\
        <h2 class="when' + cssForDay(item.start_time) + '">\
          <span class="day">' + formatDay(item.start_time) + '</span>\
          <span class="time">' + formatTimeFor(item) + '</span>\
        </h2>\
        <h3 class="what">\
          <span class="title">' + item.title + '</span>\
        </h3>\
        <h4 class="where">\
          <span class="location">' + item.location + '</span>\
        </h4>\
        <p class="extra-details">\
          ' + ((item.repeat != null) && (item.repeat.next_start_time != null) ? '<span class="repeats_next">' + item.repeat.next_start_time + '</span>' : '') + '\
        </p>\
        ' + ((item.summary != null) && item.summary.length > 0 ? '<div class="about"><p>' + item.summary.replace(/(<([^>]+)>)/ig, ' ') + '</p></div>' : '') + '\
        <h4 class="contact">\
          <span class="school">' + item.group.school + '</span>\
          <span class="group">' + item.group.name + '</span>\
          <span class="link">' + item.link.replace(/^http(s?):\/\/(www)?\./i, '').replace(/\/(\d+)-?[a-z\-]+$/i, '/$1') + '</span>\
        </h4>\
      </div>\
    </article>';
      $("#announcements").append(output);
      $("#" + item.id).animate({
        opacity: 1
      }, 1000).prev().animate({
        opacity: 0
      }, 500);
      $("#announcements").animate({
        left: '-=' + screenWidth
      }, 1500, 'easeInOutBack');
      getShortenedLinkFor(item);
      return null;
    };
    startDisplaying = function() {
      if (!(running != null)) {
        log('running...');
        sendToDisplay();
        running = setInterval(function(){sendToDisplay();}, runTime);
      }
      return null;
    };
    buffer = function() {
      log('buffering...');
      return $.ajax({
        url: "https://www.lclark.edu/api/v1/events/image_width/600/limit/50/json",
        method: 'GET',
        dataType: 'jsonp',
        success: function(data, textStatus, jqXHR) {
          var i;
          log('received data');
          for (i in data) {
            queueUp(validated(data[i]));
          }
          return startDisplaying();
        },
        error: function(jqXHR, textStatus, errorThrown) {
          log('received error');
          errorMax -= 1;
          if (errorMax < 0) {
            return clearInterval(buffering);
          }
        }
      });
    };
    startBuffering = function() {
      if (!(buffering != null)) {
        buffer();
        buffering = setInterval(function(){buffer();}, bufferTime);
      }
      return null;
    };
    return startBuffering();
  });
}).call(this);
