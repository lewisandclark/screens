express = require 'express'
fs = require 'fs'
env = require __dirname + '/env'

ssl =
  key: fs.readFileSync __dirname + '/on.lclark.edu.key'
  ca: [fs.readFileSync(__dirname + '/SSL_CA_certificate2.pem'), fs.readFileSync(__dirname + '/SSL_CA_certificate3.pem')]
  cert: fs.readFileSync __dirname + '/on.lclark.edu.cert'

app = express.createServer(ssl)

app.configure ->
  app.set 'host', 'on.lclark.edu'
  app.set 'views', __dirname + '/../views'
  app.set 'view engine', 'jade'
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use app.router
  app.use express.static __dirname + '/../public'

app.configure 'development', ->
  app.set 'port', env.ports.devSSL
  app.use express.logger()
  app.use express.errorHandler { dumpExceptions: true, showStack: true }

app.configure 'production', ->
  app.set 'port', env.ports.proSSL
  app.use express.errorHandler()

module.exports = app
