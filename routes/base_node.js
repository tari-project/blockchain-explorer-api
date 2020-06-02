const express = require('express')
const router = express.Router()

const { emission } = require('../helpers/tokens')
const { range } = require('../helpers/array')
const { redisPageRange } = require('../helpers/paging')
const {
  blockHeight,
  getBlocks,
  getConstants,
  getTransactions,
  getChainRunningTime,
  getDifficulties
} = require('../helpers/sync')
const { baseNode } = require('../protos')

router.get('/chain-metadata', async (req, res) => {
  try {
    const now = (new Date()).getTime()
    const { start: startMs = now - (24 * 60 * 60 * 1000) } = req.query
    const blocksFromTip = Math.abs((now - startMs) / 1000 / 120) * -1
    const [chainTip, transactions, chainRunningTime, difficulties] = await Promise.all([blockHeight(), getTransactions(startMs), getChainRunningTime(), getDifficulties(blocksFromTip)])

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
      avgBlockTimes = transactionTimes / (transactions.length - 1)
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

    return res.json({
      startMs,
      blocksFromTip,
      blockHeight: chainTip,
      totalTransactions,
      chainRunningTime,
      averageDifficulty,
      averageFee,
      avgBlockTimes
    })
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/blocks', async (req, res, next) => {
  try {
    const chainTip = await blockHeight()
    const { getRange, paging } = redisPageRange(req.query, chainTip, '')
    const start = Math.min(...getRange)
    const end = Math.max(...getRange)
    const blocks = (await getBlocks(start, end))

    return res.json({ blocks, paging })
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/headers', async (req, res, next) => {
  try {
    const chainTip = await blockHeight()
    const { getRange, paging } = redisPageRange(req.query, chainTip, '')
    const start = Math.min(...getRange)
    const end = Math.max(...getRange)
    const headers = (await getBlocks(start, end)).map(b => {
      const { block: { header } } = b
      return header
    })

    return res.json({ headers, paging })
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/transactions', async (req, res) => {
  if (!req.query.from) {
    return res.sendStatus(400)
  }

  const from = +req.query.from
  if (isNaN(from)) {
    return res.sendStatus(400)
  }

  try {
    const transactions = await getTransactions(from)
    return res.json({ transactions })
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/calc-timing', async (req, res) => {
  try {
    const data = await baseNode.GetCalcTiming(req.query)
    return res.json(data)
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/constants', async (_, res) => {
  try {
    const data = await getConstants()
    return res.json(data)
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/block-size', async (req, res) => {
  try {
    const data = await baseNode.GetBlockSize(req.query)
    return res.json(data)
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/block-fees', async (req, res) => {
  try {
    const data = await baseNode.GetBlockFees(req.query)
    return res.json(data)
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/version', async (_, res) => {
  try {
    const data = await baseNode.GetVersion()
    return res.json(data)
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/tokens-in-circulation', async (req, res) => {
  try {
    const constants = await getConstants()
    const chainTip = await blockHeight()

    const start = +(req.query.start || 0)
    const end = +(req.query.end || start)
    let heights = []
    if (start) {
      heights = range(start, end - start, false)
    } else {
      const fromTip = +(req.query.from_tip || 1)
      heights = range(chainTip - fromTip, fromTip, false)
    }

    const data = []
    for (const i in heights) {
      const height = +heights[i]
      // TODO NBNBNBNB Figure out why we need this magic number of 31.... seriously dirty hack, but midnight is upon us.
      const totalTokensInCirculation = emission(constants.emission_initial, constants.emission_decay, constants.emission_tail, height) + 31
      data.push({
        height,
        totalTokensInCirculation
      })
    }
    return res.json(data)
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/network-difficulty', async (req, res) => {
  try {
    const data = await baseNode.GetNetworkDifficulty(req.query)
    return res.json(data)
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

module.exports = router
