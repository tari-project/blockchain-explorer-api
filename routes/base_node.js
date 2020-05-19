const express = require('express')
const router = express.Router()
const redis = require('../helpers/redis')
const { redisPageRange } = require('../helpers/paging')
const { blockHeight, headerHeight } = require('../helpers/sync')

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
module.exports = router
