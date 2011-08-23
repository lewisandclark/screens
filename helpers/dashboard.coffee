
events = require 'events'

env = require __dirname + '/../config/env'

class Dashboard

  constructor: () ->
    @error = require __dirname + '/error'
    db = require __dirname + '/db'
    @db = new db

  @['prototype'] = new events.EventEmitter

  capture: (data) ->
    @db.add_to_sorted_set("impressions:#{data['key']}", (new Date()).getTime(), JSON.stringify(data['screen']))
    

module.exports = Dashboard
