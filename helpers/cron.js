const cron = require('node-cron')
const sync = require('./sync')
const options = { scheduled: true }

const schedule = (sockets) => {
  console.debug('Starting scheduled sync')
  // Sync constants only needs to happen on load
  console.log('Syncing Constants')
  sync.syncConstants().catch(e => {
    console.error('Sync Constants Error', e)
  })
  console.log('Starting Cron', 'Sync Blocks and Headers')
  // Check every 2 minutes for new blocks and headers
  cron.schedule('*/2 * * * *', () => {
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
