
$(document).ready ->

  queue = []
  running = null
  buffering = null
  runTime = 10000
  bufferTime = 60000
  errorMax = 3
  withImagesOnly = false
  stopAfter = 50
  screenWidth = $(window).width()
  screenHeight = $(window).height()
  shown = 0
  alertLogMessages = false

  days = [
    'Sunday'
    'Monday'
    'Tuesday'
    'Wednesday'
    'Thursday'
    'Friday'
    'Saturday'
  ]
  monthsAbbreviated = [
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
  jQuery.timeago.settings.strings = {
    prefixAgo: 'updated '
    prefixFromNow: null
    suffixAgo: "ago"
    suffixFromNow: "from now"
    seconds: "less than a minute"
    minute: "about a minute"
    minutes: "%d minutes"
    hour: "about an hour"
    hours: "about %d hours"
    day: "a day"
    days: "%d days"
    month: "about a month"
    months: "%d months"
    year: "about a year"
    years: "%d years"
    numbers: []
  }

  requiredFields = [
    'id'
    'updated_at'
    'title'
    'summary'
    'group'
    'link'
  ]
  requiredEventFields = [
    'start_time'
    'location'
  ]

  log = (message) ->
    console.log message if typeof console isnt 'undefined'
    alert message if alertLogMessages

  pad = (n) ->
    return '0' + n if n < 10
    return n

  fromISO8601 = (s) ->
    d = new Date s
    if isNaN(d)
      minutesOffset = 0
      struct = /^(\d{4}|[+\-]\d{6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?))?/.exec(s)
      if struct[8] isnt 'Z'
        minutesOffset = (+struct[10]) * 60 + (+struct[11])
        if struct[9] is '+'
          minutesOffset = 0 - minutesOffset
      d = Date.UTC(+struct[1], +struct[2] - 1, +struct[3], +struct[4], +struct[5] + minutesOffset, +struct[6], (if typeof struct[7] is 'undefined' then 0 else +struct[7].substr(0, 3)))
      d = new Date d if typeof d is 'number'
    return d

  toISO8601 = (d) ->
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z'

  validated = (item=null, kind='event') ->
    return null if item is null
    for i of requiredFields
      return null if typeof item[i] is undefined or item[i] is null
    if kind is 'event'
      for i of requiredEventFields
        return null if typeof item[i] is undefined or item[i] is null
    now = new Date()
    for i of item
      switch i
        when 'id'
          item[i] = parseInt item[i]
        when 'start_time', 'end_time', 'updated_at'
          item[i] = fromISO8601(item[i])
          return null if i is 'start_time' and item[i].getTime() < now.getTime()
        when 'group', 'author'
          item[i].id = parseInt(item[i].id)
        when 'repeats'
          item[i].repeats_until = fromISO8601(item[i].repeats_until) if item[i] is not null and item[i].repeats_until is not null
    return item

  queueUp = (item=null) ->
    return false if item is null
    return false if withImagesOnly and (!item.images? or !item.images[0]?)
    log 'inserting/updating item in queue'
    log item
    for i of queue
      if queue[i].id == item.id
        queue[i] = item
        return true
    queue.push item
    return true

  getShortenedLinkFor = (item=null) ->
    return false if item is null
    $.ajax({
      url: 'http://api.bitly.com/v3/shorten?login=lcweblab&apiKey=R_6b2425f485649afae898025bcd17458d&longUrl=' + encodeURI(item.link) + '&format=json'
      method: 'GET'
      dataType: 'json'
      success: (data, textStatus, jqXHR) ->
        log 'received data from bit.ly'
        log data
        if data? and data.data? and data.data.url?
          $('article#' + item.id).find('.link').html(data.data.url + '<img src="' + data.data.url + '.qrcode" alt="QR Code" />')
      error: (jqXHR, textStatus, errorThrown) ->
        log "received error from bit.ly #{textStatus}"
    })
    return null

  isThisWeek = (d) ->
    now = new Date()
    log d.getTime() 
    log now.getTime()
    log (d.getTime() - now.getTime())
    return ((d.getTime() - now.getTime()) < 604800000)

  isToday = (d) ->
    now = new Date()
    return (isThisWeek(d) and d.getDay() is now.getDay())

  isTomorrow = (d) ->
    now = new Date()
    return (isThisWeek(d) and ((d.getDay() - 1) is now.getDay() or (d.getDay() is 0 and now.getDay() is 6)))

  cssForDay = (d) ->
    return '' if not isThisWeek(d)
    return ' today' if isToday(d)
    return ' tomorrow' if isTomorrow(d)
    return ' within-a-week'

  formatDay = (d) ->
    return 'Today' if isToday(d)
    return 'Tomorrow' if isTomorrow(d)
    return days[d.getDay()] if isThisWeek(d)
    return "#{monthsAbbreviated[d.getMonth()]} #{d.getDate()}"

  formatTime = (d, meridian=true) ->
    if d.getHours() > 12
      return "#{(d.getHours() - 12)}:#{pad(d.getMinutes())}#{(' p.m.' if meridian)}"
    else
      return "#{d.getHours()}:#{pad(d.getMinutes())}#{(' a.m.' if meridian)}"

  formatTimeFor = (item=null) ->
    return '' if item is null
    if end_time?
      if item.start_time.getDay() is item.end_time.getDay()
        if item.start_time.getHours() < 12 and item.end_time.getHours() > 12
          return "#{formatTime(item.start_time)} &ndash; #{formatTime(item.end_time)}"
        else
          return "#{formatTime(item.start_time, false)}&ndash;#{formatTime(item.end_time)}"
      else
        return "#{formatTime(item.start_time)} &ndash; #{formatTime(item.end_time)}"
    else
      return 'All Day' if item.start_time.getHours() is 0 and item.start_time.getMinutes() is 0
      return formatTime(item.start_time)

  sendToDisplay = ->
    return null if queue.length is 0
    buffer() if queue.length < 3
    stopAfter -= 1
    if stopAfter < 0
      clearInterval(running)
      clearInterval(buffering)
      log 'stopping'
      return null
    item = queue.shift()
    shown += 1
    log 'generating output'
    output = '
    <article id="' + item.id + '" style="opacity: 0;left:' + (screenWidth * shown + 18) + 'px;width: ' + (screenWidth-36) + 'px;height: ' + (screenHeight-36) + 'px;">
      ' + (if item.images? and item.images[0]? then '<img src="' + item.images[0].url + '" alt="' + item.images[0].alt + '" />' else '') + '
      <div>
        <h2 class="when' + cssForDay(item.start_time) + '">
          <span class="day">' + formatDay(item.start_time) + '</span>
          <span class="time">' + formatTimeFor(item) + '</span>
        </h2>
        <h3 class="what">
          <span class="title">' + item.title + '</span>
        </h3>
        <h4 class="where">
          <span class="location">' + item.location + '</span>
        </h4>
        <p class="extra-details">
          ' + (if item.repeat? and item.repeat.next_start_time? then '<span class="repeats_next">' + item.repeat.next_start_time + '</span>' else '') + '
        </p>
        ' + (if item.summary? and item.summary.length > 0 then '<div class="about"><p>' + item.summary.replace(/(<([^>]+)>)/ig, ' ') + '</p></div>' else '') + '
        <h4 class="contact">
          <span class="school">' + item.group.school + '</span>
          <span class="group">' + item.group.name + '</span>
          <span class="link">' + item.link.replace(/^http(s?):\/\/(www)?\./i, '').replace(/\/(\d+)-?[a-z\-]+$/i, '/$1') + '</span>
        </h4>
      </div>
    </article>'
    $("#announcements").append(output)
    $("#" + item.id).animate({
      opacity: 1
    }, 1000).prev().animate({
      opacity: 0
    }, 500)
    $("#announcements").animate({
      left: '-=' + screenWidth
    }, 1500, 'easeInOutBack')
    getShortenedLinkFor item
    return null

  startDisplaying = ->
    if !running?
      log 'running...'
      sendToDisplay()
      running = setInterval(`function(){sendToDisplay();}`, runTime) 
    return null

  buffer = ->
    log 'buffering...'
    $.ajax({
      url: "https://www.lclark.edu/api/v1/events/image_width/600/limit/50/json"
      method: 'GET'
      dataType: 'jsonp'
      success: (data, textStatus, jqXHR) ->
        log 'received data'
        for i of data
          queueUp validated data[i]
        startDisplaying()
      error: (jqXHR, textStatus, errorThrown) ->
        log 'received error'
        errorMax -= 1
        clearInterval(buffering) if errorMax < 0
    })

  startBuffering = ->
    if !buffering?
      buffer()
      buffering = setInterval(`function(){buffer();}`, bufferTime)
    return null

  startBuffering()
