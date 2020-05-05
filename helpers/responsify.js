const responsify = (call, responseIsArray) => {
  return new Promise((resolve, reject) => {
    let data
    if (responseIsArray) {
      data = []
    }
    call.on('data', (result) => {
      if (responseIsArray) {
        data.push(result)
      } else {
        data = result
      }
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
module.exports = responsify
