const config = {
  port: process.env.PORT || '4000',
  noCron: process.env.NO_CRON,
  redisUrl: process.env.REDIS_URL,
  adminToken: process.env.ADMIN_TOKEN,
  grpcUrl: process.env.GRPC_URL,
  protoRemoteUrl: process.env.PROTO_REMOTE_URL
}
module.exports = config
