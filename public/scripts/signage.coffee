
$(document).ready ->

  $("#guide").fadeIn(750)

  socket = io.connect window.location
  views = new Views()
  controller = new Controller(socket, views)
  document.signage =
    views: views
    controller: controller

  socket.on 'screen',
    (data) ->
      document.signage.controller.set_screen(data)

  socket.on 'update',
    (data) ->
      document.signage.controller.update(data)

  socket.on 'remove',
    (data) ->
      document.signage.controller.remove(data['key'])

  socket.on 'empty',
    (data) ->
      console.log 'empty received'
      console.log data

  socket.on 'error',
    (data) ->
      console.log 'error received'
      console.log data

  socket.on 'speed',
    (data) ->
      document.signage.controller.set_speed(data)

  socket.on 'reload',
    (data) ->
      window.location.reload()


class Controller

  constructor: (socket, views) ->
    @socket = socket
    @views = views
    @queue = []
    @buffer_size = 30
    @screen = {}
    @position = 0
    @additions = []
    @removals = []
    @interval = null
    @timeout = null
    @seconds = 10

  running: () ->
    return true if @interval?
    false

  waiting: () ->
    return true if @timeout?
    false

  set_screen: (screen) ->
    @screen = screen
    @buffer()

  set_speed: (data) ->
    seconds = parseInt(data['seconds'])
    if !isNaN(seconds)
      @seconds = seconds
      clearInterval @interval
      @interval = setInterval("document.signage.controller.next()", (@seconds * 1000))

  stop: () ->
    clearInterval @interval
  
  has: (key) ->
    for queued, index in @queue
      return index if key is queued['key']
    null

  date: (value) ->
    new Date(Date.parse(value))

  datify: (item) ->
    for property, value of item
      item[property] = @date(value) if typeof value is 'string' and value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/)
    item

  qrcodify: (key, link) ->
    object = @
    $.ajax({
      url: 'http://api.bitly.com/v3/shorten?login=lcweblab&apiKey=R_6b2425f485649afae898025bcd17458d&longUrl=' + encodeURI(link) + '&format=json'
      method: 'GET'
      dataType: 'json'
      success: (data, textStatus, jqXHR) ->
        if data? and data.data? and data.data.url?
          index = object.has(key)
          object.queue[index]['item']['qrcode'] = data.data.url if index?
        else if data? and data.status_code? and data.status_txt?
          object.socket.emit 'error', { screen: object.screen, error: "qrcodify.ajax.error: #{data.status_code} #{data.status_txt}" }
      error: (jqXHR, textStatus, errorThrown) ->
        object.socket.emit 'error', { screen: object.screen, error: "qrcodify.ajax.error: #{textStatus} #{errorThrown}" }
    })

  is_live: (item) ->
    return true if item['status'] is 1
    false

  has_matching_channel: (item) ->
    return true if (not item['channels']?)
    return true if item['channels'].indexOf(@screen['channel']) >= 0
    false

  insert_index: (data) ->
    return 0 if @queue.length is 0
    for queued, index in @queue
      return index if data['item']['start_time'].getTime() < queued['item']['start_time'].getTime()
    return @queue.length if @queue.length < @buffer_size
    null

  update: (data) ->
    try
      data['item'] = JSON.parse data['item']
      data['item'] = @datify(data['item'])
      exists = @has(data['key'])
      if exists?
        @queue[exists] = data
        @qrcodify(data['key'], data['item']['link']) if (not data['item']['qrcode']?)
      else if @is_live(data['item']) and @has_matching_channel(data['item'])
        if !@running()
          @queue.push data
          @qrcodify(data['key'], data['item']['link']) if (not data['item']['qrcode']?)
        else
          @additions.push data
      @timeout = setTimeout("document.signage.controller.begin()", (@seconds * 1000)) if !@running() and !@waiting()
      # @begin() if !@running() # and !@waiting()
    catch e
      console.log e

  remove: (key) ->
    @removals.push key

  buffer: () ->
    return if @queue.length >= @buffer_size - 10
    @socket.emit 'items', { count: (@buffer_size - @queue.length) }

  begin: () ->
    $("#guide").fadeOut(750)
    @render()
    @interval = setInterval("document.signage.controller.next()", (@seconds * 1000))

  next: () ->
    if @position is -1
      $("#guide").fadeOut(750)
    @position += 1
    if @position >= @queue.length
      @reset()
    else
      @render()

  reset: () ->
    $("#guide").fadeIn(750)
    $("#announcements").html('').css('left', 0)
    @position = -1
    for addition in @additions
      index = @insert_index(addition)
      if index?
        @queue.splice(index, 0, addition)
        @qrcodify(addition['key'], addition['item']['link']) if (not addition['item']['qrcode']?)
    @additions = []
    for queued in @queue
      @removals.push(queued['key']) if @is_past(queued['item'])
    for key in @removals
      index = @has(key)
      @queue.splice(index, 1) if index?
    @removals = []
    @buffer()

  is_all_day: (item) ->
    return false if item['start_time'].getHours() isnt 0 or item['start_time'].getMinutes() isnt 0
    return true if item['end_time'] is null
    return false if item['end_time'].getHours() isnt 0 or item['end_time'].getMinutes() isnt 0
    true

  is_past: (item) ->
    d = new Date()
    return false if item['start_time'].getTime() > d.getTime()
    return true if @is_all_day(item) and d.getHours() > 20 # past eight p.m. if all day
    return true if item['end_time']? and d.getTime() > (item['start_time'].getTime() + (item['end_time'].getTime() - item['start_time'].getTime())/4) # past 25% of allotted time if end time
    return true if d.getTime() > (item['start_time'].getTime() + 900000) # past fifteen minutes after the event start time
    false

  render: () ->
    @views.render(@position, @queue[@position])
    @socket.emit 'impression', { screen: @screen, key: @queue[@position]['key'] }

  end: () ->
    clearInterval @interval


class Views

  constructor: () ->
    @screenWidth = $(window).width()
    @screenHeight = $(window).height()
    @days = [
      'Sunday'
      'Monday'
      'Tuesday'
      'Wednesday'
      'Thursday'
      'Friday'
      'Saturday'
      ]
    @months = [
      'Jan.'
      'Feb.'
      'Mar.'
      'Apr.'
      'May'
      'June'
      'July'
      'Aug.'
      'Sept.'
      'Oct.'
      'Nov.'
      'Dec.'
      ]

  pad: (n) ->
    return '0' + n if n < 10
    return n

  is_today: (d) ->
    now = new Date()
    (@is_this_week(d) and d.getDay() is now.getDay())

  is_tomorrow: (d) ->
    now = new Date()
    (@is_this_week(d) and ((d.getDay() - 1) is now.getDay() or (d.getDay() is 0 and now.getDay() is 6)))

  is_this_week: (d) ->
    now = new Date()
    ((d.getTime() - now.getTime()) < 604800000)

  day_css: (d) ->
    return '' if not @is_this_week(d)
    return ' today' if @is_today(d)
    return ' tomorrow' if @is_tomorrow(d)
    ' within-a-week'

  day_for: (d) ->  
    return 'Today' if @is_today(d)
    return 'Tomorrow' if @is_tomorrow(d)
    return @days[d.getDay()] if @is_this_week(d)
    "#{@months[d.getMonth()]} #{d.getDate()}"

  format_time: (d, meridian=true) ->
    return "Midnight" if @is_midnight(d)
    return "Noon" if @is_noon(d)
    return "#{(d.getHours() - 12)}:#{@pad(d.getMinutes())}#{(if meridian then ' p.m.' else '')}" if d.getHours() > 12
    return "#{d.getHours()}:#{@pad(d.getMinutes())}#{(if meridian then ' p.m.' else '')}" if d.getHours() is 12
    "#{d.getHours()}:#{@pad(d.getMinutes())}#{(if meridian then ' a.m.' else '')}"

  is_midnight: (d) ->
    (d.getHours() is 0 and d.getMinutes() is 0)

  is_noon: (d) ->
    (d.getHours() is 12 and d.getMinutes() is 0)

  time_for: (item) ->
    if item['end_time']?
      if @is_midnight(item['start_time']) and @is_midnight(item['end_time']) and (item['start_time'].getDay() is item['end_time'].getDay() or item['start_time'].getDay() + 1 is item['end_time'].getDay()) 
        'All Day'
      else if item['start_time'].getDay() is item['end_time'].getDay()
        if item['start_time'].getHours() < 12 and item['end_time'].getHours() > 12
          "#{@format_time(item['start_time'])} &ndash; #{@format_time(item['end_time'])}"
        else
          "#{@format_time(item['start_time'], false)}&ndash;#{@format_time(item['end_time'])}"
      else
        "#{@format_time(item['start_time'])} &ndash; #{@format_time(item['end_time'])}"
    else
      return 'All Day' if @is_midnight(item['start_time'])
      @format_time(item['start_time'])

  location_for: (item) ->
    item['location']

  summary_for: (item) ->
    #summary = item['summary'].replace(/(<([^>]+)>)/ig
    #if summary.length > 300
    #  eos = summary.indexOf('. ', 0)
    #  while eos isnt -1 and eos < 300
    #    eos = summary.indexOf('. ', (eos+1))
    #  if eos isnt -1
    #    summary.substring(0,eos)
    #summary
    item['summary']

  render: (position, data) ->
    key = data['key'].replace(/:/, '_')
    item = data['item']
    screenWidth = $(window).width()
    screenHeight = $(window).height()
    output = '
    <article id="' + key + '" style="opacity: 0;left:' + (screenWidth * (position+1) + 18) + 'px;width: ' + (screenWidth-36) + 'px;height: ' + (screenHeight-36) + 'px;">
      ' + (if item['images']? and item['images'][0]? then '<img src="' + item['images'][0].url + '" alt="' + item['images'][0].alt + '" />' else '') + '
      <div>
        <h2 class="when' + @day_css(item['start_time']) + '">
          <span class="day">' + @day_for(item['start_time']) + '</span>
          <span class="time">' + @time_for(item) + '</span>
        </h2>
        <h3 class="what">
          <span class="title">' + item['title'] + '</span>
        </h3>
        ' + (if @location_for(item)? then '<h4 class="where"><span class="location">' + @location_for(item) + '</span></h4>' else '') + '
        <p class="extra-details">
          ' + (if item['repeat']? and item['repeat']['next_start_time']? then '<span class="repeats_next">' + item['repeat']['next_start_time'] + '</span>' else '') + '
        </p>
        ' + (if @summary_for(item)? and @summary_for(item).length > 0 then '<div class="about"><p>' + @summary_for(item).replace(/(<([^>]+)>)/ig, ' ') + '</p></div>' else '') + '
        <h4 class="contact">
          <span class="school">' + item['group']['school'] + '</span>
          <span class="group">' + item['group']['name'] + '</span>
          ' + '<span class="link">' + (if item['qrcode']? then item['qrcode'].replace(/\.qrcode$/, '') else item['link']).replace(/^http(s?):\/\/(www)?\./i, '').replace(/\/(\d+)-?[a-z\-]+$/i, '/$1') + (if item['qrcode']? then '<img src="' + (if item['qrcode'].match(/\.qrcode$/) then item['qrcode'] else "#{item['qrcode']}.qrcode") + '" alt="QR Code" />' else '') + '</span>
        </h4>
      </div>
    </article>'
    $("#announcements").append(output)
    $("#" + key).animate({
      opacity: 1
    }, 1000).prev().animate({
      opacity: 0
    }, 500)
    $("#announcements").animate({
      left: '-=' + screenWidth
    }, 1500, 'easeInOutBack')


###

TO DO - Short Term

2) Make dashboard

6) Handle Locations Better

7) Show attendance tags

9) Truncate summary.

#) image height limit

#) check failed ids: 6519, 6537, 6534, 6533, 6530, 6521, 6528

#) check failed api suck? 6746

#) rewrite is_test_screen to use screens['test']

#) switching time with title

#) remove image failures

#) kill interval before reload


TO DO - Long Term

1) filtering tests
  i) date change
  ii) authority relationship
  iii) live status change
  iv) parent filtering
  v) duplicate filtering

2) Push needs to handle image-only changes

3) Push needs to test if an update no longer matches the subscription, send is_removed

###
