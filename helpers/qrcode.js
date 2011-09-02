(function() {
  var QRCode, env, events, http, querystring;
  events = require('events');
  querystring = require('querystring');
  http = require('http');
  env = require(__dirname + '/../config/env');
  QRCode = (function() {
    function QRCode() {
      this.error = require(__dirname + '/error');
    }
    QRCode['prototype'] = new events.EventEmitter;
    QRCode.prototype.generate = function(url, size) {
      var object, options, query, req;
      if (url == null) {
        url = 'http://on.lclark.edu';
      }
      if (size == null) {
        size = 300;
      }
      query = {
        login: env.bitly.account,
        apiKey: env.bitly.api_key,
        longUrl: url,
        format: 'json',
        s: size
      };
      options = {
        host: env.bitly.host,
        path: ("" + env.bitly.path + "?") + querystring.stringify(query)
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
              if ((object['_events'] != null) && (object['_events']['success'] != null)) {
                return object.emit('success', "" + parsed.data.url + ".qrcode");
              }
            } else {
              return object.error(e, "unable to find qrcode for " + url + "; data: " + data, 'QRCode.generate.request');
            }
          } catch (e) {
            return object.error(e, "unable to parse qrcode for " + url + "; data: " + data, 'QRCode.generate.request');
          }
        });
      });
      req.on('error', function(e) {
        return object.error(e, "unable to request qrcode for " + url + "; options: " + options, 'QRCode.generate');
      });
      return true;
    };
    return QRCode;
  })();
  module.exports = QRCode;
}).call(this);
