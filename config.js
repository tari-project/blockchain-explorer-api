const config = {
  port: process.env.PORT || '4000',
  noCron: process.env.NO_CRON,
  redisUrl: process.env.REDIS_URL,
  adminToken: process.env.ADMIN_TOKEN,
  grpcUrl: process.env.GRPC_URL,
  protoRemoteUrl: process.env.PROTO_REMOTE_URL,
  blockTimeSeconds: process.env.BLOCK_TIME_SECONDS || 120,
  broadcastDebounceSeconds: process.env.BROADCAST_BLOCK_DEBOUNCE_SECONDS || 30,
  cronSyncMinutes: process.env.CRON_SYNC_MINUTES || 1
}
module.exports = config
