// Redis
const redis = require('redis')
const { redisUrl } = require('../config')
const syncClient = redis.createClient(redisUrl)
syncClient.on('error', (e) => {
  console.error(e)
})
const { promisify } = require('util')
const client = {
  _client: syncClient,
  get: promisify(syncClient.get).bind(syncClient),
  incrby: promisify(syncClient.incrby).bind(syncClient),
  mget: promisify(syncClient.mget).bind(syncClient),
  set: promisify(syncClient.set).bind(syncClient),
  zadd: promisify(syncClient.zadd).bind(syncClient),
  zrangebyscore: promisify(syncClient.zrangebyscore).bind(syncClient),
  zremrangebyscore: promisify(syncClient.zremrangebyscore).bind(syncClient),
  zrange: promisify(syncClient.zrange).bind(syncClient),
  flushall: promisify(syncClient.flushall).bind(syncClient)
}
const REDIS_STORE_KEYS = {
  BLOCK_CURRENT_HEIGHT: 'current_block_height',
  DIFFICULTY_CURRENT_HEIGHT: 'current_difficulty_height',
  TRANSACTIONS_BY_TIMESTAMP: 'transactions_by_time',
  TRANSACTIONS_TOTAL: 'transactions_total',
  DIFFICULTIES_BY_HEIGHT: 'difficulties_by_height',
  BLOCKS_BY_HEIGHT: 'blocks_by_height',
  BLOCKS_BY_TIME: 'blocks_by_time',
  CONSTANTS: 'constants'
}
module.exports = { client, REDIS_STORE_KEYS }
