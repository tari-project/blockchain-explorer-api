
module.exports = (client) => {
  return {
    GetBlocks: async (heights) => {
      return new Promise((resolve, reject) => {
        const call = client.GetBlocks({ heights })
        const data = []
        call.on('data', (blocks) => {
          data.push(blocks)
        })
        call.on('error', (error) => {
          reject(error)
        })
        call.on('end', function (e) {
          resolve(data)
        })
        call.on('status', function (status) {
        })
      })
    }
  }
}
