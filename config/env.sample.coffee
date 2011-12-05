
require __dirname + '/../helpers/array'

ports =
  dev: 3000
  devSSL: 4000
  pro: 80
  proSSL: 443

screens =
  pamplin:
    name: 'Pamplin Lobby'
    channel: 'undergraduate'
    ip: 'an-ip4-goes-here'
    test: false

channels =
  undergraduate:
    schools: ['Undergraduate', 'Lewis & Clark']
    group_ids: [3,9,12,271]
    tags: ['send-to-undergraduate-screens']
  graduate:
    schools: ['Graduate', 'Lewis & Clark']
    group_ids: [3,9,11,271]
    tags: ['send-to-graduate-screens']
  law:
    schools: ['Law', 'Lewis & Clark']
    group_ids: [3,9,10,271]
    tags: ['send-to-law-screens']

module.exports =
  system_is_live: true
  ports: ports
  port: if process.env['NODE_ENV']? and process.env['NODE_ENV'] is 'production' then ports.pro else ports.dev
  portSSL: if process.env['NODE_ENV']? and process.env['NODE_ENV'] is 'production' then ports.proSSL else ports.devSSL
  redis:
    host: if process.env['REDIS_HOST']? then process.env['REDIS_HOST'] else '127.0.0.1'
    port: if process.env['REDIS_PORT']? then process.env['REDIS_PORT'] else 6379
  health:
    available_gb_ram: 0.512
    actual_ram_threshold_percent: 30
    virtual_ram_threshold_percent: 50
    check_every_minutes: 5
  mailer:
    host: 'your.mail.server'
    port: 25
    domain: 'your.mail.server'
    ssl: false
    auth: 'login'
    username: 'username'
    password: 'password'
    to: 'admin@your.server.tld'
    from: 'admin@your.server.tld'
  bitly:
    host: 'api.bitly.com'
    path: '/v3/shorten'
    account: 'lcweblab'
    api_key: 'your bitly api key'
  livewhale:
    host: 'www.lclark.edu'
    path: '/api/v1'
    client_id: 'your-livewhale-client-id'
    client_secret: 'your-livewhale-client-secret'
    timeout: 30 # seconds
  screen_ips: (screen['ip'] for name, screen of screens)
  screens: screens
  authoritative_sources: [
    3,    # Webadmins
    7,    # Inst: Newsroom
    9,    # Home: Lewis & Clark
    10,   # Home: Law
    11,   # Home: Graduate
    12,   # Home: College
    35,   # Inst: New Media
    185,  # Inst: PubCom
    220,  # Inst: Source
    271,  # Home: Events
    273,  # Inst: Chronicle
    309,  # Home: Webcast
    323,  # Inst: Lewis and Clark Magazine
    409   # Inst: LiveWhale Support
    ]
  institutional: [
    'Lewis & Clark',
    'Home',
    'Webadmins'
    ]
  channels: channels
  directional_tags: [].concat.apply([], (criteria['tags'] for channel, criteria of channels)).unique()
  buffer_size: 20
