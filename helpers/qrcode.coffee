
events = require 'events'
querystring = require 'querystring'
http = require 'http'

env = require __dirname + '/../config/env'

class QRCode

  constructor: () ->

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
              object.emit 'success', "#{parsed.data.url}.qrcode"
          catch e
            object.emit 'error', e
    req.on 'error',
      (e) ->
        object.emit 'error', e
    true

module.exports = QRCode
