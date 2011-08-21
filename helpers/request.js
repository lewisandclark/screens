(function() {
  var crypto, env, helper;
  crypto = require('crypto');
  env = require(__dirname + '/../config/env');
  helper = {
    is_screen: function(request) {
      if ((request.connection.remoteAddress != null) && env.screen_ips.indexOf(request.connection.remoteAddress) >= 0) {
        return true;
      }
      return false;
    },
    is_trusted: function(request) {
      var calculatedSignature, encoding, hmac, providedSignature;
      if (request.body === null) {
        return false;
      }
      hmac = crypto.createHmac('sha1', env.livewhale.client_secret);
      hmac.update(request.rawBody.substring(5));
      providedSignature = request.headers['x-hub-signature'];
      calculatedSignature = hmac.digest(encoding = 'hex');
      if (providedSignature === calculatedSignature) {
        return true;
      }
      return false;
    }
  };
  module.exports = helper;
}).call(this);
