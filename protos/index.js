const GRPC_HOST = process.env.GRPC_HOST || 'localhost'
const GRPC_PORT = process.env.GRPC_PORT || 18142
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const proto = grpc.loadPackageDefinition(protoLoader.loadSync('./protos/base_node/base_node.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}))

const { tari: { base_node: tariBaseNode } } = proto

const client = new tariBaseNode.BaseNode(`${GRPC_HOST}:${GRPC_PORT}`, grpc.credentials.createInsecure())

const protos = {
  baseNode: require('./base_node/index')(client)
}
module.exports = protos
