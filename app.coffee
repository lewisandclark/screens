
url = require 'url'

env = require __dirname + '/config/env'
app = require __dirname + '/config/app'
appSSL = require __dirname + '/config/appSSL'
helpers =
  request: require __dirname + '/helpers/request'
  qrcode: require __dirname + '/helpers/qrcode'
  filter: require __dirname + '/helpers/filter'

# fs.statSync(path)

# promo_qr_code = new helpers.qrcode()
# promo_qr_code.on 'success',
#   (url) ->
#     console.log url
#     true
# promo_qr_code.generate()

# App
app.get '/',
  (req, res) ->
    if helpers.request.is_screen(req)
      res.render 'signage/index.jade', { layout: 'layouts/signage.jade', locals: { title: 'Lewis & Clark Campus Display System', digital_ts: '10029244356' } }
    else
      res.render 'static/promo.jade', { layout: 'layouts/simple.jade', locals: { title: 'Lewis & Clark' } }

app.listen(env.port)


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
          filter = new helpers.filter
          filter.process(update)
        res.send('OK')
      catch e
        console.log e
        res.send(e, 500)
    else
      console.log 'Failed Trust'
      res.send('Failed Trust', 406)

appSSL.listen(env.portSSL)

