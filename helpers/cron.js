const cron = require('node-cron')
const sync = require('./sync')
const { blockTimeSeconds, cronSyncMinutes } = require('../config')
const { getBlockHeight } = require('../models/base_node')
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

  // Schedule a re-org sync every day
  cron.schedule('0 7 * * *', () => {
    getBlockHeight().then(height => {
      // Sync the last 2 days blocks approx
      const blocksToSync = 2 * 24 * 60 * 60 / blockTimeSeconds
      const startingHeight = height - blocksToSync
      sync.syncBlocks(sockets, startingHeight).catch(e => {
        console.error('Re-org sync error', e)
      })
    })
  })
  return cron
}
module.exports = {
  cron,
  schedule
}
