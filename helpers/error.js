(function() {
  var Error;
  Error = function(error, message, caller) {
    if (message == null) {
      message = null;
    }
    if (caller == null) {
      caller = null;
    }
    console.log(error);
    if (message != null) {
      console.log(message);
    }
    if (caller != null) {
      console.log(caller);
    }
    if (this['_events']['error'] != null) {
      this.emit('error', error);
    }
    return true;
  };
  module.exports = Error;
}).call(this);
