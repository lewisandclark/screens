(function() {
  var channel, channels, criteria, name, ports, screen, screens;
  require(__dirname + '/../helpers/array');
  ports = {
    dev: 3000,
    devSSL: 4000,
    pro: 80,
    proSSL: 443
  };
  screens = {
    pamplin: {
      name: 'Pamplin Lobby',
      channel: 'undergraduate',
      ip: 'an-ip4-goes-here',
      test: false
    }
  };
  channels = {
    undergraduate: {
      schools: ['Undergraduate', 'Lewis & Clark'],
      group_ids: [3, 9, 12, 271],
      tags: ['send-to-undergraduate-screens']
    },
    graduate: {
      schools: ['Graduate', 'Lewis & Clark'],
      group_ids: [3, 9, 11, 271],
      tags: ['send-to-graduate-screens']
    },
    law: {
      schools: ['Law', 'Lewis & Clark'],
      group_ids: [3, 9, 10, 271],
      tags: ['send-to-law-screens']
    }
  };
  module.exports = {
    system_is_live: true,
    ports: ports,
    port: (process.env['NODE_ENV'] != null) && process.env['NODE_ENV'] === 'production' ? ports.pro : ports.dev,
    portSSL: (process.env['NODE_ENV'] != null) && process.env['NODE_ENV'] === 'production' ? ports.proSSL : ports.devSSL,
    redis: {
      host: process.env['REDIS_HOST'] != null ? process.env['REDIS_HOST'] : '127.0.0.1',
      port: process.env['REDIS_PORT'] != null ? process.env['REDIS_PORT'] : 6379
    },
    bitly: {
      host: 'api.bitly.com',
      path: '/v3/shorten',
      account: 'lcweblab',
      api_key: 'your bitly api key'
    },
    livewhale: {
      host: 'www.lclark.edu',
      path: '/api/v1',
      client_id: 'your-livewhale-client-id',
      client_secret: 'your-livewhale-client-secret'
    },
    screen_ips: (function() {
      var _results;
      _results = [];
      for (name in screens) {
        screen = screens[name];
        _results.push(screen['ip']);
      }
      return _results;
    })(),
    screens: screens,
    authoritative_sources: [3, 7, 9, 10, 11, 12, 35, 185, 220, 271, 273, 309, 323, 409],
    institutional: ['Lewis & Clark', 'Home', 'Webadmins'],
    channels: channels,
    directional_tags: [].concat.apply([], (function() {
      var _results;
      _results = [];
      for (channel in channels) {
        criteria = channels[channel];
        _results.push(criteria['tags']);
      }
      return _results;
    })()).unique(),
    buffer_size: 20
  };
}).call(this);
