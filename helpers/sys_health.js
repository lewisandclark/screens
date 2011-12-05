(function() {
  var SysHealth, env, events, sys_health;
  events = require('events');
  env = require(__dirname + '/../config/env');
  SysHealth = (function() {
    function SysHealth() {
      var obj;
      this.error = require(__dirname + '/error');
      this.actual_threshold = (env.health.available_gb_ram * 1000000000) * (env.health.actual_ram_threshold_percent / 100);
      this.virtual_threshold = (env.health.available_gb_ram * 1000000000) * (env.health.virtual_ram_threshold_percent / 100);
      obj = this;
      setInterval(function() {
        return obj.memory_check();
      }, env.health.check_every_minutes * 1000 * 60);
      this.memory_check();
    }
    SysHealth['prototype'] = new events.EventEmitter;
    SysHealth.prototype.memory_check = function() {
      var memory, message;
      memory = process.memoryUsage();
      if ((memory != null) && (memory.rss > this.actual_threshold || memory.vsize > this.virtual_threshold)) {
        message = '';
        if (memory.rss > this.actual_threshold) {
          message += "health memory check: " + memory.rss + " exceeds actual ram of " + this.actual_threshold + "\n";
        }
        if (memory.vsize > this.virtual_threshold) {
          message += "health memory check: " + memory.vsize + " does not exceed virtual ram of " + this.virtual_threshold + "\n";
        }
        message += "[shutting-down]";
        this.error('health check failure', message, 'SysHealth.memory_check', function(error, result) {
          return process.exit(0);
        });
      } else {
        console.log("health memory check: " + memory.rss + " does not exceed actual ram of " + this.actual_threshold);
        console.log("health memory check: " + memory.vsize + " does not exceed virtual ram of " + this.virtual_threshold);
      }
      return true;
    };
    return SysHealth;
  })();
  sys_health = new SysHealth();
  module.exports = sys_health;
}).call(this);
