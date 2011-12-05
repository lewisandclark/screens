
events = require 'events'
env = require __dirname + '/../config/env'

class SysHealth

  constructor: () ->
    @error = require __dirname + '/error'
    @actual_threshold = ((env.health.available_gb_ram * 1000000000) * (env.health.actual_ram_threshold_percent / 100))
    @virtual_threshold = ((env.health.available_gb_ram * 1000000000) * (env.health.virtual_ram_threshold_percent / 100))
    obj = @
    setInterval(
      () ->
        obj.memory_check()
    , (env.health.check_every_minutes * 1000 * 60))
    @memory_check()

  @['prototype'] = new events.EventEmitter

  memory_check: () ->
    memory = process.memoryUsage()
    if memory? and (memory.rss > @actual_threshold or memory.vsize > @virtual_threshold)
      message = ''
      message += "health memory check: #{memory.rss} exceeds actual ram of #{@actual_threshold}\n" if memory.rss > @actual_threshold
      message += "health memory check: #{memory.vsize} does not exceed virtual ram of #{@virtual_threshold}\n" if memory.vsize > @virtual_threshold
      message += "[shutting-down]"
      @error 'health check failure', message, 'SysHealth.memory_check', (error, result) ->
        process.exit(0)
    else
      console.log "health memory check: #{memory.rss} does not exceed actual ram of #{@actual_threshold}"
      console.log "health memory check: #{memory.vsize} does not exceed virtual ram of #{@virtual_threshold}"
    true

sys_health = new SysHealth()
module.exports = sys_health
