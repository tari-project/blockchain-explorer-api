const convertBuffToHex = (data) => {
  if (typeof data === 'object') {
    if (Buffer.isBuffer(data)) {
      return data.toString('hex')
    } else {
      for (const i in data) {
        data[i] = convertBuffToHex(data[i])
      }
      return data
    }
  } else {
    return data
  }
}

const responsify = (call, responseIsArray, shouldConvertBuffToHex) => {
  return new Promise((resolve, reject) => {
    let data
    if (responseIsArray) {
      data = []
    }
    call.on('data', (result) => {
      const processedResult = shouldConvertBuffToHex ? convertBuffToHex(result) : result
      if (responseIsArray) {
        data.push(processedResult)
      } else {
        data = processedResult
      }
    })
    call.on('error', (error) => {
      console.error('grpc error', error)
      reject(error)
    })
    call.on('end', function (e) {
      resolve(data)
    })
    call.on('status', function (status) {
      // console.debug('grpc status', status)
    })
  })
}
module.exports = responsify
