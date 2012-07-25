
$(document).ready ->

  $("#guide").fadeIn(750)

  require './string'
  socket = io.connect window.location.origin
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
      document.signage.controller.last_buffer = false
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
    @maximum_buffer_frequency = (15 * 60) # 15 minutes in seconds
    @buffered_at = 0
    @buffer_scheduled = null
    @max_buffer_size = 20
    @min_buffer_size = Math.floor(@max_buffer_size / 5)
    @range = (12 * 24 * 60 * 60 * 1000) # 12 days
    @screen = {}
    @position = 0
    @additions = []
    @removals = []
    @interval = null
    @timeout = null
    @seconds = (if window.location.href.match(/\:3000/) then 2 else 9)
    @blocked = false
    @authoritative_sources = [
      3,    # Webadmins
      7,    # Inst: Newsroom
      9,    # Home: Lewis & Clark
      10,   # Home: Law
      11,   # Home: Graduate
      12,   # Home: College
      35,   # Inst: New Media
      185,  # Inst: PubCom
      220,  # Inst: Source
      271,  # Home: Events
      273,  # Inst: Chronicle
      309,  # Home: Webcast
      323,  # Inst: Lewis and Clark Magazine
      409   # Inst: LiveWhale Support
    ]

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

  already_has: (item, queue = @queue) ->
    for queued in queue
      continue if queued['item']['start_time'].getTime() isnt item['start_time'].getTime() # skip if start time does not match
      continue if queued['item']['places'][0]['id'] isnt item['places'][0]['id'] # skip if in a different place
      continue if queued['item']['title'].similar(item['title'], true) < 85 # skip if title is not better than an 85% match
      return true if item['parent_id'] isnt null and item['parent_id'] is queued['item']['id'] # parent already present
      if queued['item']['parent_id'] isnt null and queued['item']['parent_id'] is item['id'] # incoming parent replacing current
        @removals.push(queued['key'])
        return false
      return true if @authoritative_sources.indexOf(queued['item']['group']['id']) >= 0 # current item is authoritative
      if @authoritative_sources.indexOf(item['group']['id']) >= 0 # incoming item is authoritative
        @removals.push(queued['key'])
        return false
      return true # neither is authoritative, prefer FIFO
    false
  
  has: (key, queue = @queue) ->
    for queued, index in queue
      return index if key is queued['key']
    null

  date: (value) ->
    new Date(Date.parse(value))

  datify: (item) ->
    for property, value of item
      item[property] = @date(value) if typeof value is 'string' and (value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\+\-]{1}\d{2}:\d{2}/) or value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/))
    item

  is_live: (item) ->
    return true if item['status'] is 1
    false

  has_matching_channel: (item) ->
    return true if (not item['channels']?)
    return true if item['channels'].indexOf(@screen['channel']) >= 0
    false

  range_index: () ->
    d = new Date()
    for queued, index in @queue
      return index if queued['item']['start_time'].getTime() > d.getTime() + @range
    @queue.length

  insert_index: (data) ->
    return 0 if @queue.length is 0
    for queued, index in @queue
      return index if data['item']['start_time'].getTime() < queued['item']['start_time'].getTime()
    @queue.length

  update: (data) ->
    try
      data['item'] = JSON.parse data['item']
      data['item'] = @datify(data['item'])
      exists = @has(data['key'])
      if exists?
        @queue[exists] = data
      else if data['item'] isnt null and @is_live(data['item']) and @has_matching_channel(data['item'])
        if @queue.length is 0
          @queue.push data
        else
          index = @has(data['key'], @additions)
          if index?
            @additions[index] = data
          else
            @additions.push data
      @timeout = setTimeout("document.signage.controller.begin()", (@seconds * 1000)) if !@running() and !@waiting()
    catch e
      console.log e

  remove: (key) ->
    @removals.push key

  buffer: ( seconds=@maximum_buffer_frequency ) ->
    if @queue.length < @min_buffer_size
      @socket.emit 'items', { count: (@min_buffer_size * 4) }
    else
      return false if @buffer_scheduled?
      now = (new Date).getTime()
      if now - @buffered_at < seconds * 1000
        return @delay_buffering(((seconds * 1000) - (now - @buffered_at)) / 1000)
      @buffered_at = now
      return if @queue.length >= @min_buffer_size * 4
      @socket.emit 'items', { count: (@min_buffer_size * 4) }

  delay_buffering: ( seconds=@maximum_buffer_frequency ) ->
    clearTimeout @buffer_scheduled
    object = @
    @buffer_scheduled = setTimeout(`function(){object.buffer_scheduled=null;object.buffer();}`, (seconds * 1000))

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
      exists = @has(addition['key'])
      if exists is null
        if not @already_has(addition['item'])
          index = @insert_index(addition)
          if index?
            @queue.splice(index, 0, addition)
      else
        @queue[exists] = addition
    @additions = []
    for queued in @queue
      if @is_past(queued['item'])
        @removals.push(queued['key'])
    for key in @removals
      index = @has(key)
      @queue.splice(index, 1) if index?
    if @queue.length > @max_buffer_size
      @queue.splice(@max_buffer_size, (@queue.length - @max_buffer_size))
    end_of_range = @range_index()
    if end_of_range < @queue.length and end_of_range > @min_buffer_size
      @queue.splice(end_of_range, (@queue.length - end_of_range))
    else if end_of_range < @queue.length and @queue.length > @min_buffer_size
      @queue.splice(@min_buffer_size, (@queue.length - @min_buffer_size))
    @buffer() if @removals.length > 0 or @queue.length < @min_buffer_size
    @removals = []

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
    if @queue[@position]['qrcode_wait']?
      @queue[@position]['qrcode_wait'] -= 1
      @queue[@position]['qrcode_wait'] = null if @queue[@position]['qrcode_wait'] is 0
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
    ((d.getTime() - now.getTime()) < (6 * 24 * 60 * 60 * 1000))

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

  has_summary: (item) ->
    summary = @summary_for(item)
    (summary? and summary.length? and summary.length > 0)

  summary_for: (item) ->
    summary = item['summary'].replace(/(<([^>]+)>)/ig, ' ').replace('&#160;', ' ').replace(/^\s+|\s+$/, '').replace(/\s+/, ' ')
    return "#{summary.substr(0, summary.lastIndexOf(' ', 290))} &hellip;" if summary.length > 290
    summary

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
          <span class="title">' + item['title'].toTitleCaps() + '</span>
        </h3>
        ' + (if @location_for(item)? then '<h4 class="where"><span class="location">' + @location_for(item) + '</span></h4>' else '') + '
        <p class="extra-details">
          ' + (if item['repeat']? and item['repeat']['next_start_time']? then '<span class="repeats_next">' + item['repeat']['next_start_time'] + '</span>' else '') + '
        </p>
        ' + (if @has_summary(item) then '<div class="about"><p>' + @summary_for(item) + '</p></div>' else '') + '
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
