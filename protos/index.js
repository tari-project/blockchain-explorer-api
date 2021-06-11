const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const { grpcUrl } = require('../config')

const proto = grpc.loadPackageDefinition(protoLoader.loadSync('./protos/base_node/base_node.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}))

const { tari: { rpc } } = proto

const opts = {
  'grpc.max_receive_message_length': 10 * 1024 * 1024
}

const client = new rpc.BaseNode(grpcUrl, grpc.credentials.createInsecure(), opts)

const protos = {
  baseNode: require('./base_node/index')(client)
}

module.exports = protos
