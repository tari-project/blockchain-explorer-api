const redis = require('./redis')
const CURRENT_BLOCK_HEIGHT_KEY = 'current_block_height'
const CURRENT_HEADER_HEIGHT_KEY = 'current_header_height'
const protos = require('../protos')
const syncBlocks = async () => {
  const currentCacheBlockHeight = await redis.get(CURRENT_BLOCK_HEIGHT_KEY) || 0
  console.log('Fetching current block')
  // Get the tip
  const chainBlockHeight = await protos.baseNode.ListHeaders({ num_headers: 1 })
  const { height: currentChainBlockHeight } = chainBlockHeight.pop()

  // Fetch all the blocks for the range
  const heights = _range(currentChainBlockHeight, currentCacheBlockHeight)
  const blocks = await protos.baseNode.GetBlocks(heights)

  // const { block: { height } } = blocks[0]
  // console.log(blocks[0])
  // console.log(JSON.stringify(blocks[0], null, 2))

  blocks.forEach(blockData => {
    const { block: { header: { height } } } = blockData
    console.log(JSON.stringify(height))
    redis.set(`block_${height}`, JSON.stringify(blockData))
  })
}

const syncHeaders = async () => {

}

function _range (size, startAt = 0, zeroBasedArray) {
  size = zeroBasedArray ? size : size + 1
  startAt = zeroBasedArray ? startAt : startAt + 1
  return [...Array(+size).keys()].map(i => i + +startAt)
}

module.exports = {
  syncBlocks,
  syncHeaders
}
