(function() {
  var DateWrapper, events;
  events = require('events');
  DateWrapper = (function() {
    function DateWrapper() {
      this.error = require(__dirname + '/error');
    }
    DateWrapper['prototype'] = new events.EventEmitter;
    DateWrapper.prototype.parse = function(date_string) {
      try {
        return Date.parse(date_string);
      } catch (e) {
        return this.error(e, "unable to create date from string: " + date_string, 'DateWrapper.parse');
      }
    };
    DateWrapper.prototype.parseDate = function(date_string) {
      return new Date(this.parse(date_string));
    };
    return DateWrapper;
  })();
  module.exports = DateWrapper;
}).call(this);
