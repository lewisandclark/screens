
crypto = require 'crypto'

env = require __dirname + '/../config/env'

helper =
  is_screen: (request) ->
    return true if request.connection.remoteAddress? and env.screen_ips.indexOf(request.connection.remoteAddress) >= 0
    false
  is_trusted: (request) ->
    return false if request.body is null
    hmac = crypto.createHmac('sha1', env.livewhale_client_secret)
    hmac.update request.rawBody.substring(5) # remove leading body=
    providedSignature = request.headers['x-hub-signature']
    calculatedSignature = hmac.digest(encoding='hex')
    return true if providedSignature is calculatedSignature
    false

module.exports = helper
