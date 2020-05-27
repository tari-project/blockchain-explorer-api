const express = require('express')
const router = express.Router()
const redis = require('../helpers/redis')
const { redisPageRange } = require('../helpers/paging')
const { blockHeight, headerHeight, getTransactions } = require('../helpers/sync')
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
    const chainTip = await blockHeight()

    return res.json({ blockHeight: chainTip })
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
  baseNode._checkVersion(req.query.update)
  return res.sendStatus(200)
})

module.exports = router
