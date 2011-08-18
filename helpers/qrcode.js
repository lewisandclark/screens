(function() {
  var QRCode, env, events, http, querystring;
  events = require('events');
  querystring = require('querystring');
  http = require('http');
  env = require(__dirname + '/../config/env');
  QRCode = (function() {
    function QRCode() {}
    QRCode['prototype'] = new events.EventEmitter;
    QRCode.prototype.generate = function(url, size) {
      var object, options, query, req;
      if (url == null) {
        url = 'http://on.lclark.edu';
      }
      if (size == null) {
        size = 800;
      }
      query = {
        login: env.bitly_account,
        apiKey: env.bitly_api_key,
        longUrl: url,
        format: 'json',
        s: size
      };
      options = {
        host: 'api.bitly.com',
        path: '/v3/shorten?' + querystring.stringify(query)
      };
      object = this;
      req = http.get(options, function(res) {
        var data;
        data = '';
        res.on('data', function(chunk) {
          return data += chunk;
        });
        return res.on('end', function() {
          var parsed;
          try {
            parsed = JSON.parse(data);
            if ((parsed != null) && (parsed.data != null) && (parsed.data.url != null)) {
              return object.emit('success', "" + parsed.data.url + ".qrcode");
            }
          } catch (e) {
            return object.emit('error', e);
          }
        });
      });
      req.on('error', function(e) {
        return object.emit('error', e);
      });
      return true;
    };
    return QRCode;
  })();
  module.exports = QRCode;
}).call(this);
