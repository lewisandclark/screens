
env = require __dirname + '/config/env'
app = require __dirname + '/config/app'

# fs.statSync(path)

app.get '/',
  (req, res) ->
    res.render 'index', { title: 'Lewis & Clark Campus Display System', digital_ts: '10029244356' }

app.listen(env.port)
