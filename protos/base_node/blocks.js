
module.exports = (client) => {
  return {
    GetBlocks: async (heights) => {
      return new Promise((resolve, reject) => {
        const call = client.GetBlocks({ heights })
        call.on('data', (blocks) => {
          resolve(blocks)
        })
        call.on('error', (error) => {
          reject(error)
        })
        call.on('end', function (e) {
          // The server has finished sending
        })
        call.on('status', function (status) {
          // process status
        })
      })
    }
  }
}
