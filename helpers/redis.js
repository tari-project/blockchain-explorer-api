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
module.exports = client
