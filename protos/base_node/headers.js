
module.exports = (client) => {
  return {
    ListHeaders: async (listHeadersRequest) => {
      const options = {
        from_height: null,
        num_headers: null,
        sorting: 0,
        ...listHeadersRequest
      }
      return new Promise((resolve, reject) => {
        const call = client.ListHeaders(options)
        const data = []
        call.on('data', (headers) => {
          data.push(headers)
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
