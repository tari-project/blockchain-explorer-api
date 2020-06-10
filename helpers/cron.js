const cron = require('node-cron')
const sync = require('./sync')
const { cronSyncMinutes } = require('../config')
const options = { scheduled: true }

const schedule = (sockets) => {
  // Sync constants only needs to happen on load
  console.log('Syncing Constants')
  sync.syncConstants().catch(e => {
    console.error('Sync Constants Error', e)
  })
  const minutes = Math.floor(cronSyncMinutes)
  console.log('Starting Cron', 'Sync Blocks and Headers every', minutes, 'minutes')
  cron.schedule(`*/${minutes} * * * *`, () => {
    sync.syncBlocks(sockets).catch(e => {
      console.error('Sync Blocks Error', e)
    })
    sync.syncDifficulties().catch(e => {
      console.error('Sync Difficulties Error', e)
    })
  }, options)
  return cron
}
module.exports = {
  cron,
  schedule
}
