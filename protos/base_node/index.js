const responsify = require('../../helpers/responsify')
const fetch = require('node-fetch')
const md5 = require('md5')
const fs = require('fs')
const path = require('path')
module.exports = (client) => {
  return {
    _checkVersion: async (saveNewVersion) => {
      const response = await fetch(process.env.PROTO_REMOTE_URL)
      const remoteProto = await response.text()
      const remoteMd5 = md5(remoteProto)
      const localPath = path.join(__dirname, '/base_node.proto')
      const localProto = fs.readFileSync(localPath)
      const localMd5 = md5(localProto)
      if (localMd5 !== remoteMd5) {
        console.log('There is a new version of the proto file')
        if (saveNewVersion) {
          console.log('Overwriting proto file with latest')
          fs.writeFileSync(localPath, remoteProto)
        }
      }
    },
    GetChainTip: async function () {
      const chainTip = await this.ListHeaders({ num_headers: 1 })
      const { height } = chainTip.pop()
      return +height
    },
    GetBlocks: async (heights) => {
      return responsify(client.GetBlocks({ heights }), true, true)
    },
    ListHeaders: async (listHeadersRequest) => {
      const options = {
        from_height: null,
        num_headers: null,
        sorting: 0,
        ...listHeadersRequest
      }
      return responsify(client.ListHeaders(options), true, true)
    }
  }
}
