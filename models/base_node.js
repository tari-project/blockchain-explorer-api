const { client: redis, REDIS_STORE_KEYS } = require('../helpers/redis')
const config = require('../config')

const getChainMetadata = async (startMs, blocksFromTip) => {
  const now = (new Date()).getTime()
  startMs = startMs || now - (24 * 60 * 60 * 1000)
  blocksFromTip = blocksFromTip || Math.abs((now - startMs) / 1000 / config.blockTimeSeconds)
  const [chainTip, transactions, chainRunningTime, difficulties] = await Promise.all([getBlockHeight(), getTransactions(startMs), getChainRunningTime(), getDifficulties(blocksFromTip * -1)])

  const totalTransactions = transactions.reduce((acc, b) => acc + b.transactions, 0)
  const totalFees = transactions.reduce((acc, b) => acc + b.fee, 0)
  const averageFee = totalFees / totalTransactions

  let transactionTimes = 0
  let avgBlockTimes = 0
  if (transactions.length > 2) {
    transactions.forEach((t, i) => {
      if (transactions.length > i + 1) {
        transactionTimes += transactions[i + 1].timestamp - t.timestamp
      }
    })
    avgBlockTimes = Math.trunc((transactionTimes / (transactions.length - 1)) / 1000)
  }
  const averageDifficulty = {
    difficulty: 0,
    estimatedHashRate: 0
  }
  if (difficulties.length > 0) {
    difficulties.forEach(d => {
      averageDifficulty.difficulty += d.difficulty
      averageDifficulty.estimatedHashRate += d.estimatedHashRate
    })
    averageDifficulty.difficulty = averageDifficulty.difficulty / difficulties.length
    averageDifficulty.estimatedHashRate = averageDifficulty.estimatedHashRate / difficulties.length
  }

  return {
    startMs,
    blocksFromTip,
    blockHeight: chainTip,
    totalTransactions,
    chainRunningTime,
    averageDifficulty,
    averageFee,
    avgBlockTimes
  }
}

const getChainRunningTime = async () => {
  const last = await redis.zrange(REDIS_STORE_KEYS.TRANSACTIONS_BY_TIMESTAMP, -1, -1, 'withscores')
  const first = await redis.zrange(REDIS_STORE_KEYS.TRANSACTIONS_BY_TIMESTAMP, 0, 0, 'withscores')
  const start = +first.pop()
  const end = +last.pop()
  return {
    start,
    end,
    runningTimeMillis: end - start
  }
}

const getDifficulties = async (from, to = '+inf') => {
  const members = await redis.zrangebyscore(REDIS_STORE_KEYS.DIFFICULTIES_BY_HEIGHT, from, to)
  return members.map(m => {
    const [height, difficulty, estimatedHashRate] = m.split(':').map(n => +n)
    return {
      height, difficulty, estimatedHashRate
    }
  })
}

const getBlockHeight = async () => {
  return +(await redis.get(REDIS_STORE_KEYS.BLOCK_CURRENT_HEIGHT) || 0)
}

const getBlocks = async (from, to) => {
  return (await redis.zrangebyscore(REDIS_STORE_KEYS.BLOCKS_BY_HEIGHT, from, to)).map(JSON.parse)
}

const getConstants = async () => {
  const constantsString = await redis.get(REDIS_STORE_KEYS.CONSTANTS)
  if (!constantsString) {
    throw new Error('Constants have not been loaded yet')
  }
  return JSON.parse(constantsString)
}

const getTransactions = async (from, to = '+inf') => {
  const members = await redis.zrangebyscore(REDIS_STORE_KEYS.TRANSACTIONS_BY_TIMESTAMP, from, to)
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

module.exports = {
  getBlockHeight,
  getChainMetadata,
  getBlocks,
  getConstants,
  getTransactions,
  getChainRunningTime,
  getDifficulties,
  REDIS_STORE_KEYS
}
