const cron = require('node-cron')
const sync = require('./sync')
const options = { scheduled: true }

const schedule = () => {
  console.log('Starting Cron', 'Sync Blocks and Headers')
  // Check every day for events ending or starting
  cron.schedule('*/2 * * * *', () => {
    sync.syncBlocks()
    sync.syncHeaders()
  }, options)
  return cron
}
module.exports = {
  cron,
  schedule
}
