const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const { grpcUrl } = require('../config')

const proto = grpc.loadPackageDefinition(protoLoader.loadSync('./protos/base_node/base_node.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}))

const { tari: { base_node: tariBaseNode } } = proto

const client = new tariBaseNode.BaseNode(grpcUrl, grpc.credentials.createInsecure())

const protos = {
  baseNode: require('./base_node/index')(client)
}
module.exports = protos
