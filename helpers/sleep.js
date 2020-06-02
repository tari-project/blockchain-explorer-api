async function sleep (timeMs) {
  return new Promise(resolve => {
    setTimeout(resolve, timeMs)
  })
}

module.exports = sleep
