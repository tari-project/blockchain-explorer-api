// Redis
const Redis = require('ioredis')
const { redisUrl } = require('../config')
const client = new Redis(redisUrl)
client.on('error', (e) => {
  console.error(e)
})

const REDIS_STORE_KEYS = {
  BLOCK_CURRENT_HEIGHT: 'current_block_height',
  DIFFICULTY_CURRENT_HEIGHT: 'current_difficulty_height',
  TRANSACTIONS_BY_TIMESTAMP: 'transactions_by_time',
  TRANSACTIONS_TOTAL: 'transactions_total',
  DIFFICULTIES_BY_HEIGHT: 'difficulties_by_height',
  BLOCKS_BY_HEIGHT: 'blocks_by_height',
  BLOCKS_BY_TIME: 'blocks_by_time',
  BLOCKS_BY_HASH: 'blocks_by_hash',
  CONSTANTS: 'constants'
}
module.exports = { client, REDIS_STORE_KEYS }
