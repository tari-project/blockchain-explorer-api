const redis = require('./redis')
const { range } = require('./array')
const protos = require('../protos')
const sleep = require('./sleep')

let blockSyncLock = false
let difficultySyncLock = false
const CHUNK_SIZE = 1000

const REDIS_STORE_KEY_BLOCK_CURRENT_HEIGHT = 'current_block_height'
const REDIS_STORE_KEY_HEADER_CURRENT_HEIGHT = 'current_header_height'
const REDIS_STORE_KEY_DIFFICULTY_CURRENT_HEIGHT = 'current_difficulty_height'

const REDIS_STORE_KEY_TRANSACTIONS_BY_TIMESTAMP = 'transactions_by_time'
const REDIS_STORE_KEY_TRANSACTIONS_TOTAL = 'transactions_total'
const REDIS_STORE_KEY_DIFFICULTIES_BY_HEIGHT = 'difficulties_by_height'
const REDIS_STORE_KEY_BLOCKS_BY_HEIGHT = 'blocks_by_height'
const REDIS_STORE_KEY_BLOCKS_BY_TIME = 'blocks_by_time'

const difficultyHeight = async () => {
  return +(await redis.get(REDIS_STORE_KEY_DIFFICULTY_CURRENT_HEIGHT) || 0)
}

const blockHeight = async () => {
  return +(await redis.get(REDIS_STORE_KEY_BLOCK_CURRENT_HEIGHT) || 0)
}

const headerHeight = async () => {
  return +(await redis.get(REDIS_STORE_KEY_HEADER_CURRENT_HEIGHT) || 0)
}

const getTransactions = async (from, to = '+inf') => {
  const members = await redis.zrangebyscore(REDIS_STORE_KEY_TRANSACTIONS_BY_TIMESTAMP, from, to)
  const formattedMembers = members.map(m => {
    const [height, timestamp, transactions, fee] = m.split(':')
    return {
      height: +height,
      timestamp: +timestamp,
      transactions: +transactions,
      fee: +fee
    }
  })
  return formattedMembers
}

const getDifficulties = async (from, to = '+inf') => {
  const members = await redis.zrangebyscore(REDIS_STORE_KEY_DIFFICULTIES_BY_HEIGHT, from, to)
  return members.map(m => {
    const [height, difficulty, estimatedHashRate] = m.split(':').map(n => +n)
    return {
      height, difficulty, estimatedHashRate
    }
  })
}

const getBlocks = async (from, to) => {
  return (await redis.zrangebyscore(REDIS_STORE_KEY_BLOCKS_BY_HEIGHT, from, to)).map(JSON.parse)
}

const getChainRunningTime = async () => {
  const last = await redis.zrange(REDIS_STORE_KEY_TRANSACTIONS_BY_TIMESTAMP, -1, -1, 'withscores')
  const first = await redis.zrange(REDIS_STORE_KEY_TRANSACTIONS_BY_TIMESTAMP, 0, 0, 'withscores')
  const start = +first.pop()
  const end = +last.pop()
  return {
    start,
    end,
    runningTimeMillis: end - start
  }
}

const getTotalTransactions = async () => {
  return +(await redis.get(REDIS_STORE_KEY_TRANSACTIONS_TOTAL))
}

const setTransactionsCount = async (blockData) => {
  const {
    block: {
      header: { height, timestamp: { seconds } },
      body: { kernels }
    }
  } = blockData
  console.debug('Settings transactions', height)
  const transactions = kernels.length
  const totalFee = kernels.map(k => +k.fee).reduce((acc, b) => acc + b, 0)
  const timestamp = +seconds * 1000
  const member = [height, timestamp, transactions, totalFee].join(':')
  await redis.zadd(REDIS_STORE_KEY_TRANSACTIONS_BY_TIMESTAMP, timestamp, member)
  await redis.incrby(REDIS_STORE_KEY_TRANSACTIONS_TOTAL, transactions)
}

const syncDifficulties = async () => {
  if (difficultySyncLock) {
    console.log('syncDifficulties locked')
  }
  difficultySyncLock = true
  let currentCacheDifficultyHeight = await difficultyHeight()
  // Get the tip
  const currentChainTip = await protos.baseNode.GetChainTip()
  console.debug('Syncing Difficulties - Cache Height:', currentCacheDifficultyHeight, 'Chain Height:', currentChainTip)
  let currentBlockHeight = currentCacheDifficultyHeight

  while (currentCacheDifficultyHeight < currentChainTip) {
    // Fetch all the difficulties for the range
    const startHeight = currentCacheDifficultyHeight
    const endHeight = Math.min(currentCacheDifficultyHeight + CHUNK_SIZE, currentChainTip)

    console.debug('Fetching difficulty heights', startHeight, ' - ', endHeight, ' / ', currentChainTip)

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

      await redis.zadd(REDIS_STORE_KEY_DIFFICULTIES_BY_HEIGHT, height, member)
      if (blockHeight > currentBlockHeight) {
        currentBlockHeight = blockHeight
      }
    }

    await redis.set(REDIS_STORE_KEY_DIFFICULTY_CURRENT_HEIGHT, currentBlockHeight)
    console.debug('Setting new difficulty height', currentBlockHeight)
    await sleep(1000)
    currentCacheDifficultyHeight = currentBlockHeight
  }
  difficultySyncLock = false
}

const syncBlocks = async () => {
  if (blockSyncLock) {
    console.log('syncBlocks locked')
  }
  blockSyncLock = true
  let currentCacheBlockHeight = await blockHeight()
  // Get the tip
  const currentChainBlockHeight = await protos.baseNode.GetChainTip()

  console.debug('Syncing Blocks - Cache Height:', currentCacheBlockHeight, 'Chain Height:', currentChainBlockHeight)
  let currentBlockHeight = currentCacheBlockHeight
  while (currentCacheBlockHeight < currentChainBlockHeight) {
    // Fetch all the blocks for the range
    const heights = range(currentCacheBlockHeight, Math.min(CHUNK_SIZE, currentChainBlockHeight - currentCacheBlockHeight), true)

    console.debug('Fetching block heights', Math.min(...heights), ' - ', Math.max(...heights), ' / ', currentChainBlockHeight)
    const blocks = await protos.baseNode.GetBlocks(heights)

    for (const i in blocks) {
      const blockData = blocks[i]
      const { block: { header: { height, timestamp: { seconds } } } } = blockData
      const blockHeight = +height
      const blockDataString = JSON.stringify(blockData)
      const milliseconds = +seconds * 1000
      await redis.zadd(REDIS_STORE_KEY_BLOCKS_BY_HEIGHT, blockHeight, blockDataString)
      await redis.zadd(REDIS_STORE_KEY_BLOCKS_BY_TIME, milliseconds, blockDataString)
      await setTransactionsCount(blockData)
      if (blockHeight > currentBlockHeight) {
        currentBlockHeight = blockHeight
      }
    }
    await redis.set(REDIS_STORE_KEY_BLOCK_CURRENT_HEIGHT, currentBlockHeight)
    console.debug('Setting new block height', currentBlockHeight)
    await sleep(1000)
    currentCacheBlockHeight = currentBlockHeight
  }
  blockSyncLock = false
}

module.exports = {
  blockHeight,
  headerHeight,
  getBlocks,
  getTransactions,
  getTotalTransactions,
  getChainRunningTime,
  getDifficulties,
  syncBlocks,
  syncDifficulties
}
