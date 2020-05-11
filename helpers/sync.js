const redis = require('./redis')
const { range } = require('./array')
const CURRENT_BLOCK_HEIGHT_KEY = 'current_block_height'
const CURRENT_HEADER_HEIGHT_KEY = 'current_header_height'
const CHUNK_SIZE = 100
const protos = require('../protos')

const blockHeight = async () => {
  return +(await redis.get(CURRENT_BLOCK_HEIGHT_KEY) || 0)
}

const headerHeight = async () => {
  return +(await redis.get(CURRENT_HEADER_HEIGHT_KEY) || 0)
}

const syncBlocks = async () => {
  let currentCacheBlockHeight = await blockHeight()
  // Get the tip
  const currentChainBlockHeight = await protos.baseNode.GetChainTip()

  console.debug('Syncing Blocks - Cache Height:', currentCacheBlockHeight, 'Chain Height:', currentChainBlockHeight)
  let currentBlockHeight = currentCacheBlockHeight
  while (currentCacheBlockHeight < currentChainBlockHeight) {
    // Fetch all the blocks for the range
    const heights = range(currentCacheBlockHeight, Math.min(+currentCacheBlockHeight + CHUNK_SIZE, +currentChainBlockHeight))
    console.debug('Fetching block heights', Math.min(...heights), ' - ', Math.max(...heights), ' / ', currentChainBlockHeight)
    const blocks = await protos.baseNode.GetBlocks(heights)

    for (const i in blocks) {
      const blockData = blocks[i]
      const { block: { header: { height } } } = blockData
      const blockHeight = +height
      console.debug('Setting block height cache', blockHeight)
      await redis.set(`block_${blockHeight}`, JSON.stringify(blockData))
      if (blockHeight > currentBlockHeight) {
        currentBlockHeight = blockHeight
      }
    }
    await redis.set(CURRENT_BLOCK_HEIGHT_KEY, currentBlockHeight)
    console.debug('Setting new height', currentBlockHeight)
    currentCacheBlockHeight = currentBlockHeight
  }
}

const syncHeaders = async () => {
  let currentCacheHeaderHeight = await headerHeight()
  // Get the tip
  const currentChainHeaderHeight = await protos.baseNode.GetChainTip()

  console.debug('Syncing Headers - Cache Height:', currentCacheHeaderHeight, 'Chain Height:', currentChainHeaderHeight)
  let currentHeaderHeight = currentCacheHeaderHeight
  while (currentCacheHeaderHeight < currentChainHeaderHeight) {
    // Fetch all the blocks for the range
    console.debug('Fetching heights', currentCacheHeaderHeight, ' - ', +currentCacheHeaderHeight + CHUNK_SIZE, ' / ', currentChainHeaderHeight)
    const headers = await protos.baseNode.ListHeaders({
      from_height: +currentCacheHeaderHeight,
      num_headers: CHUNK_SIZE,
      sorting: 1
    })

    for (const i in headers) {
      const headerData = headers[i]
      const { height } = headerData
      const headerHeight = +height
      console.debug('Setting header height cache', headerHeight)
      await redis.set(`header_${headerHeight}`, JSON.stringify(headerData))
      if (headerHeight > currentHeaderHeight) {
        currentHeaderHeight = headerHeight
      }
    }
    await redis.set(CURRENT_HEADER_HEIGHT_KEY, currentHeaderHeight)
    console.debug('Setting new height', currentHeaderHeight)
    currentCacheHeaderHeight = currentHeaderHeight
  }
}

module.exports = {
  blockHeight,
  headerHeight,
  syncBlocks,
  syncHeaders
}
