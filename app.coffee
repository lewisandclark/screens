
url = require 'url'

env = require __dirname + '/config/env'
app = require __dirname + '/config/app'
appSSL = require __dirname + '/config/appSSL'
io = require('socket.io').listen app

helpers =
  request: require __dirname + '/helpers/request'
  filter: require __dirname + '/helpers/filter'
  retrieve: require __dirname + '/helpers/retrieve'
  dashboard: require __dirname + '/helpers/dashboard'

# App
app.get '/',
  (req, res) ->
    if (helpers.request.is_screen(req) and env.system_is_live) or helpers.request.is_test_screen(req)
      res.render 'signage/index.jade', { layout: 'layouts/signage.jade', locals: { title: 'Lewis & Clark Campus Display System', digital_ts: '10029244356' } }
    else
      res.render 'static/promo.jade', { layout: 'layouts/simple.jade', locals: { title: 'Lewis & Clark Campus Display System', buffer_size: env.buffer_size } }

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
        dashboard.capture(data)


# SSL App
appSSL.get '/',
  (req, res) ->
    res.render 'static/promo.jade', { layout: 'layouts/simple.jade', locals: { title: 'Lewis & Clark' } }

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

