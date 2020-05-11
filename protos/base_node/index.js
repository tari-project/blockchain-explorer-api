const responsify = require('../../helpers/responsify')
module.exports = (client) => {
  return {
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
