const redis = require('./redis')
const { range } = require('./array')
const CURRENT_BLOCK_HEIGHT_KEY = 'current_block_height'
const CURRENT_HEADER_HEIGHT_KEY = 'current_header_height'
const CURRENT_DIFFICULTY_HEIGHT_KEY = 'current_difficulty_height'
const CHUNK_SIZE = 100
const protos = require('../protos')

const difficultyHeight = async () => {
  return +(await redis.get(CURRENT_DIFFICULTY_HEIGHT_KEY) || 0)
}

const blockHeight = async () => {
  return +(await redis.get(CURRENT_BLOCK_HEIGHT_KEY) || 0)
}

const headerHeight = async () => {
  return +(await redis.get(CURRENT_HEADER_HEIGHT_KEY) || 0)
}

const getTransactions = async (from) => {
  const members = await redis.zrangebyscore('transactions', from, '+inf')
  const formattedMembers = members.map(m => {
    const [height, timestamp, transactions] = m.split(':')
    return {
      height: +height,
      timestamp: +timestamp,
      transactions: +transactions
    }
  })
  return formattedMembers
}

const getChainRunningTime = async () => {
  const last = await redis.zrange('transactions', -1, -1, 'withscores')
  const first = await redis.zrange('transactions', 0, 0, 'withscores')
  const start = +first.pop()
  const end = +last.pop()
  return {
    start,
    end,
    runningTimeMillis: end - start
  }
}

const getTotalTransactions = async () => {
  return +(await redis.get('total_transactions'))
}

const setTransactions = async (blockData) => {
  const {
    block: {
      header: { height, timestamp: { seconds } },
      body: { kernels }
    }
  } = blockData
  console.debug('Settings transactions', height)
  const transactions = kernels.length
  const timestamp = +seconds * 1000
  const member = [height, timestamp, transactions].join(':')
  await redis.zadd('transactions', timestamp, member)
  await redis.incrby('total_transactions', transactions)
}

const syncDifficulties = async () => {
  let currentCacheBlockHeight = await difficultyHeight()
  // Get the tip
  const currentChainBlockHeight = await protos.baseNode.GetChainTip()
  console.debug('Syncing Difficulties - Cache Height:', currentCacheBlockHeight, 'Chain Height:', currentChainBlockHeight)
  let currentBlockHeight = currentCacheBlockHeight

  while (currentCacheBlockHeight < currentChainBlockHeight) {
    // Fetch all the difficulties for the range
    const startHeight = currentCacheBlockHeight
    const endHeight = currentCacheBlockHeight + 1000

    console.debug('Fetching block heights', startHeight, ' - ', endHeight, ' / ', currentChainBlockHeight)

    const difficulties = await protos.baseNode.GetNetworkDifficulty({
      from_tip: 0,
      start_height: startHeight,
      end_height: endHeight
    })

    for (const i in difficulties) {
      let { difficulty, estimated_hash_rate: estimatedHashRate, height } = difficulties[i]
      difficulty = +difficulty
      estimatedHashRate = +estimatedHashRate
      height = +height
      const member = [height, difficulty, estimatedHashRate].join(':')
      const blockHeight = height

      await redis.zadd('difficulties', height, member)
      if (blockHeight > currentBlockHeight) {
        currentBlockHeight = blockHeight
      }
    }

    await redis.set(CURRENT_DIFFICULTY_HEIGHT_KEY, currentBlockHeight)
    console.debug('Setting new height', currentBlockHeight)
    currentCacheBlockHeight = currentBlockHeight
  }
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
      await setTransactions(blockData)
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
  getTransactions,
  getTotalTransactions,
  getChainRunningTime,
  syncBlocks,
  syncHeaders,
  syncDifficulties
}
