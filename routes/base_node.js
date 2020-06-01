const express = require('express')
const router = express.Router()
const redis = require('../helpers/redis')
const { redisPageRange } = require('../helpers/paging')
const {
  blockHeight,
  headerHeight,
  getTransactions,
  getTotalTransactions,
  syncBlocks,
  syncHeaders
} = require('../helpers/sync')
const { baseNode } = require('../protos')
const { simpleAuth } = require('../middleware/auth')

router.get('/blocks', async (req, res, next) => {
  try {
    const chainTip = await blockHeight()
    const { getRange, paging } = redisPageRange(req.query, chainTip, 'block_')
    const blocks = (await redis.mget(...getRange)).map(JSON.parse)

    return res.json({ blocks, paging })
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/chain-metadata', async (_, res) => {
  try {
    const [chainTip, totalTransactions] = await Promise.all([blockHeight(), getTotalTransactions()])

    return res.json({
      blockHeight: chainTip,
      totalTransactions
    })
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/headers', async (req, res, next) => {
  try {
    const chainTip = await headerHeight()
    const { getRange, paging } = redisPageRange(req.query, chainTip, 'header_')
    const headers = (await redis.mget(...getRange)).map(JSON.parse)

    return res.json({ blocks: headers, paging })
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

router.post('/proto', simpleAuth, async (req, res) => {
  const result = await baseNode._checkVersion(req.query.update)
  return res.json(result)
})

router.post('/sync', simpleAuth, async (req, res) => {
  syncBlocks()
  syncHeaders()
  return res.status(202).json({
    status: 'OK',
    message: 'Sync initiated.'
  })
})

router.post('/flush', simpleAuth, async (req, res) => {
  redis.flushall()
  return res.status(202).json({
    status: 'OK',
    message: 'Flush ALL initiated'
  })
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
    const data = await baseNode.GetConstants()
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
    const data = await baseNode.GetTokensInCirculation(req.query)
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
