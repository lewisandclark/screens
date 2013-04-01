
url = require 'url'

env = require __dirname + '/config/env'
app = require __dirname + '/config/app'
appSSL = require __dirname + '/config/appSSL'
io = require('socket.io').listen app
io.set('log level', 1) if process.env['NODE_ENV']? and process.env['NODE_ENV'] is 'production'

helpers =
  request: require __dirname + '/helpers/request'
  filter: require __dirname + '/helpers/filter'
  retrieve: require __dirname + '/helpers/retrieve'
  dashboard: require __dirname + '/helpers/dashboard'
  sys_health: require __dirname + '/helpers/sys_health'

# App
app.get '/',
  (req, res) ->
    if (helpers.request.is_screen(req) and env.system_is_live) or helpers.request.is_test_screen(req)
      # res.render 'static/offline.jade', { layout: 'layouts/offline.jade', locals: { title: 'Lewis & Clark Campus Display System' } }
      # res.render 'static/empty.jade', { layout: 'layouts/simple.jade', locals: { title: 'Lewis & Clark Campus Display System' } }
      res.render 'signage/index.jade', { layout: 'layouts/signage.jade', locals: { title: 'Lewis & Clark Campus Display System', digital_ts: '10029244356' } }
    else
      # res.render 'static/promo.jade', { layout: 'layouts/simple.jade', locals: { title: 'Lewis & Clark Campus Display System', buffer_size: env.buffer_size } }
      res.redirect 'http://www.lclark.edu/support/displays/'
app.get '/reload',
  (req, res) ->
    io.sockets.volatile.emit 'reload'
    res.redirect 'http://on.lclark.edu'

app.get '/speed/:value',
  (req, res) ->
    seconds = req.params.value
    io.sockets.volatile.emit 'speed', { seconds: seconds }
    res.redirect 'http://on.lclark.edu'

app.get '/channel/:channel',
  (req, res) ->
    console.log req.params.channel
    res.render 'signage/index.jade', { layout: 'layouts/signage.jade', locals: { title: 'Lewis & Clark Campus Display System', digital_ts: '10029244356' } }

app.listen(env.port)

io.sockets.on 'connection',
  (socket) ->
    retrieve = new helpers.retrieve(socket)
    dashboard = new helpers.dashboard()
    socket.on 'items',
      (data) ->
        retrieve.get_lead_member(data['count'])
    socket.on 'impression',
      (data) ->
        dashboard.capture(data) if not data['screen']['test']
        true
    socket.on 'error',
      (data) ->
        console.log "error from #{data['screen']['name']}"
        console.log data['error']
    socket.on 'log',
      (data) ->
        console.log "log from #{data['screen']['name']}"
        console.log data['log']
    true


# SSL App
appSSL.get '/',
  (req, res) ->
    res.redirect 'http://on.lclark.edu'

appSSL.get '/updates',
  (req, res) ->
    params = url.parse(req.url, true).query
    res.send(params['hub.challenge'] or 'No hub.challenge present')

appSSL.post '/updates',
  (req, res) ->
    if helpers.request.is_trusted(req)
      try
        updates = JSON.parse(req.body.body)
        for update in updates
          filter = new helpers.filter(io)
          filter.process(update)
        res.send('OK')
      catch e
        console.log e
        res.send(e, 500)
    else
      console.log 'Failed Trust'
      res.send('Failed Trust', 406)

appSSL.listen(env.portSSL)

