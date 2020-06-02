const convertBuffToHex = (data) => {
  if (typeof data === 'object') {
    if (data.constructor.name === 'Buffer') {
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
      console.log('grpc status', status)
    })
  })
}
module.exports = responsify
