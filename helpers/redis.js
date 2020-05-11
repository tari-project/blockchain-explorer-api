// Redis
const redis = require('redis')
const syncClient = redis.createClient(process.env.REDIS_URL)
const { promisify } = require('util')
const client = {
  get: promisify(syncClient.get).bind(syncClient),
  mget: promisify(syncClient.mget).bind(syncClient),
  set: promisify(syncClient.set).bind(syncClient)
}
module.exports = client
