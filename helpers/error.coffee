
env = require __dirname + '/../config/env'
mailer = require 'mailer'

Error = (error, message=null, caller=null, send_email=null) ->
  console.log error
  console.log message if message?
  console.log caller if caller?
  if send_email is true or typeof send_email is 'function'
    email = env.mailer
    email.subject = "screens error: #{error}"
    if message?
      email.body = "The following error occurred:\n\n#{message}" if message?
    else
      email.subject += " > EOM"
      email.body = ""
    mailer.send email, (e, result) ->
      if e?
        console.log e
      else if result
        console.log "email was successfully sent"
      send_email(e, result) if typeof send_email is 'function'
      true
  this.emit 'error', error if this['_events']? and this['_events']['error']?
  true

module.exports = Error
