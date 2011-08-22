
$(document).ready ->

  socket = io.connect window.location
  views = new Views()
  controller = new Controller(socket, views)

  socket.on 'channel',
    (data) ->
      controller.set_channel(data['channel'])

  socket.on 'items',
    (data) ->
      console.log "items received"
      console.log data
      for item in data['items']
        console.log item
        controller.add(item)

  socket.on 'update',
    (data) ->
      alert "item received"
      controller.update(data['item'])

  socket.on 'reload',
    (data) ->
      window.location.reload()


class Controller

  constructor: (socket, views) ->
    @socket = socket
    @views = views
    @queue = []
    @buffer_size = 30
    @channel = ''
    @position = 0

  set_channel: (channel) ->
    @channel = channel
    @buffer()
  
  has: (item) ->
    for queued in @queue
      return true if item.key() is queued.key()

  add: (item) ->
    console.log item
    @queue.push item   # need to insert into queue by time
    @next() if @queue.length is 1

  remove: () ->
    @buffer()

  buffer: () ->
    return if @queue.length >= @buffer_size
    @socket.emit 'items', { count: (@buffer_size - @queue.length) }

  next: () ->
    @position += 1
    if @position >= @queue.length
      @reset()
    else
      @views.render(@position, @queue[@position])

  reset: () ->
    # show help, clear behind, reset section
    $("#announcements").html('').css('left', 0)
    @position = 0
    @views.render(@position, @queue[@position])


class Views

  constructor: () ->
    @screenWidth = $(window).width()
    @screenHeight = $(window).height()

  render: (position, item) ->
    properties = item['properties']
    console.log item['properties']
    output = '
    <article id="' + item['type'] + '_' + properties['id'] + '" style="opacity: 0;left:' + (@screenWidth * position + 18) + 'px;width: ' + (@screenWidth-36) + 'px;height: ' + (@screenHeight-36) + 'px;">
      ' + (if properties['images']? and properties['images'][0]? then '<img src="' + properties['images'][0].url + '" alt="' + properties['images'][0].alt + '" />' else '') + '
      <div>
        <h3 class="what">
          <span class="title">' + properties['title'] + '</span>
        </h3>
        <h4 class="where">
          <span class="location">' + properties['location'] + '</span>
        </h4>
        <p class="extra-details">
          ' + (if properties['repeat']? and properties['repeat']['next_start_time']? then '<span class="repeats_next">' + properties['repeat']['next_start_time'] + '</span>' else '') + '
        </p>
        ' + (if properties['summary']? and properties['summary'].length > 0 then '<div class="about"><p>' + properties['summary'].replace(/(<([^>]+)>)/ig, ' ') + '</p></div>' else '') + '
        <h4 class="contact">
          <span class="school">' + properties['group']['school'] + '</span>
          <span class="group">' + properties['group']['name'] + '</span>
          <span class="link">' + properties['link'].replace(/^http(s?):\/\/(www)?\./i, '').replace(/\/(\d+)-?[a-z\-]+$/i, '/$1') + '</span>
        </h4>
      </div>
    </article>'
    $("#announcements").append(output)
    $("#" + item['type'] + '_' + properties['id']).animate({
      opacity: 1
    }, 1000).prev().animate({
      opacity: 0
    }, 500)
    $("#announcements").animate({
      left: '-=' + @screenWidth
    }, 1500, 'easeInOutBack')


###

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

###
