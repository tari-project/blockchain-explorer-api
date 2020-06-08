const redis = require('./redis')
const { range } = require('./array')
const protos = require('../protos')
const sleep = require('./sleep')

const LOCKS = {
  blocks: false,
  difficulties: false,
  constants: false
}

const CHUNK_SIZE = 1000

const REDIS_STORE_KEY_BLOCK_CURRENT_HEIGHT = 'current_block_height'
const REDIS_STORE_KEY_DIFFICULTY_CURRENT_HEIGHT = 'current_difficulty_height'
const REDIS_STORE_KEY_TRANSACTIONS_BY_TIMESTAMP = 'transactions_by_time'
const REDIS_STORE_KEY_TRANSACTIONS_TOTAL = 'transactions_total'
const REDIS_STORE_KEY_DIFFICULTIES_BY_HEIGHT = 'difficulties_by_height'
const REDIS_STORE_KEY_BLOCKS_BY_HEIGHT = 'blocks_by_height'
const REDIS_STORE_KEY_BLOCKS_BY_TIME = 'blocks_by_time'
const REDIS_STORE_KEY_CONSTANTS = 'constants'

// Don't spam the websocket clients on initial sync
const WS_DEBOUNCE_TIMEOUT = 90 * 1000
let webSocketDebounce = 0

const difficultyHeight = async () => {
  return +(await redis.get(REDIS_STORE_KEY_DIFFICULTY_CURRENT_HEIGHT) || 0)
}

const blockHeight = async () => {
  return +(await redis.get(REDIS_STORE_KEY_BLOCK_CURRENT_HEIGHT) || 0)
}

const getConstants = async () => {
  const constantsString = await redis.get(REDIS_STORE_KEY_CONSTANTS)
  if (!constantsString) {
    return await syncConstants()
  }
  return JSON.parse(constantsString)
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
  const transactions = kernels.length
  const totalFee = kernels.map(k => +k.fee).reduce((acc, b) => acc + b, 0)
  const timestamp = +seconds * 1000
  const member = [height, timestamp, transactions, totalFee].join(':')
  await redis.zremrangebyscore(REDIS_STORE_KEY_TRANSACTIONS_BY_TIMESTAMP, timestamp, timestamp)
  await redis.zadd(REDIS_STORE_KEY_TRANSACTIONS_BY_TIMESTAMP, timestamp, member)
  await redis.incrby(REDIS_STORE_KEY_TRANSACTIONS_TOTAL, transactions)
}

const syncDifficulties = async () => {
  if (LOCKS.difficulties) {
    console.log('syncDifficulties locked')
    return
  }
  LOCKS.difficulties = true
  try {
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
        const blockHeight = +height
        const member = [blockHeight, difficulty, estimatedHashRate].join(':')

        await redis.zremrangebyscore(REDIS_STORE_KEY_DIFFICULTIES_BY_HEIGHT, blockHeight, blockHeight)
        await redis.zadd(REDIS_STORE_KEY_DIFFICULTIES_BY_HEIGHT, blockHeight, member)
        if (blockHeight > currentBlockHeight) {
          currentBlockHeight = blockHeight
        }
      }

      await redis.set(REDIS_STORE_KEY_DIFFICULTY_CURRENT_HEIGHT, currentBlockHeight)
      console.debug('Setting new difficulty height', currentBlockHeight)
      await sleep(1000)
      currentCacheDifficultyHeight = currentBlockHeight
    }
  } catch (e) {
    console.error('Error syncDifficulties', e)
  } finally {
    LOCKS.difficulties = false
  }
}

const syncBlocks = async (sockets) => {
  if (LOCKS.blocks) {
    console.log('syncBlocks locked')
    return
  }
  LOCKS.blocks = true
  try {
    let currentCacheBlockHeight = await blockHeight()
    // Get the tip
    const currentChainTip = await protos.baseNode.GetChainTip()
    console.debug('Syncing Blocks - Cache Height:', currentCacheBlockHeight, 'Chain Height:', currentChainTip)
    let currentBlockHeight = currentCacheBlockHeight
    while (currentCacheBlockHeight < currentChainTip) {
      // Fetch all the blocks for the range
      const heights = range(currentCacheBlockHeight, Math.min(CHUNK_SIZE, currentChainTip - currentCacheBlockHeight) + 1, true)

      console.debug('Fetching block heights', Math.min(...heights), ' - ', Math.max(...heights), ' / ', currentChainTip)
      const blocks = await protos.baseNode.GetBlocks(heights)
      blocks.sort((a, b) => +a.block.header.timestamp.seconds - +b.block.header.timestamp.seconds)
      for (const i in blocks) {
        const blockData = blocks[i]
        const { block: { header: { height, timestamp: { seconds } } } } = blockData
        const blockHeight = +height
        const milliseconds = +seconds * 1000
        // Pull the previous block to calculate the _miningTime
        let miningTime = 0
        if (blockHeight > 0) {
          let prevBlock
          if (i > 0) {
            prevBlock = blocks[i - 1]
          } else {
            prevBlock = (await getBlocks(blockHeight - 1, blockHeight - 1)).pop()
          }

          const prevBlockSeconds = +prevBlock.block.header.timestamp.seconds
          miningTime = +seconds - prevBlockSeconds
        }
        blockData.block._miningTime = miningTime

        const blockDataString = JSON.stringify(blockData)
        await redis.zremrangebyscore(REDIS_STORE_KEY_BLOCKS_BY_HEIGHT, blockHeight, blockHeight)
        await redis.zadd(REDIS_STORE_KEY_BLOCKS_BY_HEIGHT, blockHeight, blockDataString)
        await redis.zremrangebyscore(REDIS_STORE_KEY_BLOCKS_BY_TIME, blockHeight, blockHeight)
        await redis.zadd(REDIS_STORE_KEY_BLOCKS_BY_TIME, milliseconds, blockDataString)
        await setTransactionsCount(blockData)
        if (blockHeight > currentBlockHeight) {
          currentBlockHeight = blockHeight
          const now = (new Date()).getTime()
          if (now > webSocketDebounce + WS_DEBOUNCE_TIMEOUT) {
            webSocketDebounce = now
            sockets.broadcast({ type: 'newBlock', data: blockData })
          }
        }
      }
      await redis.set(REDIS_STORE_KEY_BLOCK_CURRENT_HEIGHT, currentBlockHeight)
      console.debug('Setting new block height', currentBlockHeight)
      await sleep(1000)
      currentCacheBlockHeight = currentBlockHeight
    }
  } catch (e) {
    console.error('Error syncBlocks', e)
  } finally {
    LOCKS.blocks = false
  }
}

const syncConstants = async () => {
  if (LOCKS.constants) {
    console.log('syncConstants Locked')
    return
  }
  LOCKS.constants = true
  let constants = {}
  try {
    console.debug('Setting constants')
    constants = await protos.baseNode.GetConstants()
    await redis.set(REDIS_STORE_KEY_CONSTANTS, JSON.stringify(constants))
  } catch (e) {
    console.error('Error syncConstants', e)
  } finally {
    LOCKS.constants = false
  }

  return constants
}

module.exports = {
  blockHeight,
  getConstants,
  getBlocks,
  getTransactions,
  getTotalTransactions,
  getChainRunningTime,
  getDifficulties,
  syncBlocks,
  syncDifficulties,
  syncConstants,
  LOCKS
}
