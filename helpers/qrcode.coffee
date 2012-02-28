
events = require 'events'
querystring = require 'querystring'
http = require 'http'

env = require __dirname + '/../config/env'

class QRCode

  constructor: () ->
    @waiting = null
    @error = require __dirname + '/error'

  @['prototype'] = new events.EventEmitter

  generate: (url='http://on.lclark.edu', size=300) ->
    query =
      login: env.bitly.account
      apiKey: env.bitly.api_key
      longUrl: url
      format: 'json'
      s: size
    options =
      host: env.bitly.host
      path: "#{env.bitly.path}?" + querystring.stringify(query)
    object = @
    req = http.get options,
      (res) ->
        data = ''
        res.on 'data', (chunk) ->
          data += chunk
        res.on 'end', () ->
          try
            parsed = JSON.parse data
            if parsed? and parsed.data? and parsed.data.url?
              object.emit('success', "#{parsed.data.url}.qrcode") if object['_events']? and object['_events']['success']?
            else
              object.retry(url, size)
              object.error e, "unable to find qrcode for #{url}; data: #{data}", 'QRCode.generate.request'
          catch e
            object.retry(url, size)
            object.error e, "unable to parse qrcode for #{url}; data: #{data}", 'QRCode.generate.request'
    req.on 'error',
      (e) ->
        object.retry(url, size)
        object.error e, "unable to request qrcode for #{url}; options: #{options}", 'QRCode.generate'
    true

  retry: (url, size) ->
    clearTimeout(@waiting)
    object = @
    setTimeout(`function(){object.generate(url, size);}`, env.bitly.retry_every_minutes * 60 * 1000)


module.exports = QRCode
