(function() {
  var Error, env, mailer;
  env = require(__dirname + '/../config/env');
  mailer = require('mailer');
  Error = function(error, message, caller, send_email) {
    var email;
    if (message == null) {
      message = null;
    }
    if (caller == null) {
      caller = null;
    }
    if (send_email == null) {
      send_email = null;
    }
    console.log(error);
    if (message != null) {
      console.log(message);
    }
    if (caller != null) {
      console.log(caller);
    }
    if (send_email === true || typeof send_email === 'function') {
      email = env.mailer;
      email.subject = "screens error: " + error;
      if (message != null) {
        if (message != null) {
          email.body = "The following error occurred:\n\n" + message;
        }
      } else {
        email.subject += " > EOM";
        email.body = "";
      }
      mailer.send(email, function(e, result) {
        if (e != null) {
          console.log(e);
        } else if (result) {
          console.log("email was successfully sent");
        }
        if (typeof send_email === 'function') {
          send_email(e, result);
        }
        return true;
      });
    }
    if ((this['_events'] != null) && (this['_events']['error'] != null)) {
      this.emit('error', error);
    }
    return true;
  };
  module.exports = Error;
}).call(this);
