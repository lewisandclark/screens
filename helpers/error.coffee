
Error = (error, message=null, caller=null) ->
  console.log error
  console.log message if message?
  console.log caller if caller?
  this.emit 'error', error if this['_events']['error']?
  true

module.exports = Error
