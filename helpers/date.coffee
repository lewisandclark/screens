
events = require 'events'

class DateWrapper

  constructor: () ->
    @error = require __dirname + '/error'
    @days = [
      'Sunday'
      'Monday'
      'Tuesday'
      'Wednesday'
      'Thursday'
      'Friday'
      'Saturday'
    ]
    @monthsAbbreviated = [
      'Jan.'
      'Feb.'
      'Mar.'
      'Apr.'
      'May'
      'June'
      'July'
      'Aug.'
      'Sept.'
      'Oct.'
      'Nov.'
      'Dec.'
    ]

  @['prototype'] = new events.EventEmitter

  parse: (date_string) ->
    try
      Date.parse(date_string)
    catch e
      @error e, "unable to create date from string: #{date_string}", 'DateWrapper.parse'

  parseDate: (date_string) ->
    new Date(@parse(date_string))

date_wrapper = new DateWrapper()
module.exports = date_wrapper
