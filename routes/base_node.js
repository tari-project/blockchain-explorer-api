const express = require('express')
const router = express.Router()

const { rangeInclusive } = require('../helpers/array')
const { redisPageRange } = require('../helpers/paging')
const {
  getBlockHeight,
  getChainMetadata,
  getConstants,
  getBlocksByHeight,
  getTransactions,
  getBlocksByHashes
} = require('../models/base_node')
const { baseNode } = require('../protos')

router.get('/chain-metadata', async (req, res) => {
  try {
    const metadata = await getChainMetadata(req.query.start)
    return res.json(metadata)
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/block/:blockId', async (req, res) => {
  try {
    const { blockId } = req.params
    const block = Number.isInteger(+blockId) ? await getBlocksByHeight(+blockId, +blockId) : await getBlocksByHashes([blockId])
    return res.json(block.pop())
  } catch (e) {
    console.error(e)
    return res.sendStatus(500).json(e)
  }
})

router.get('/blocks', async (req, res, next) => {
  try {
    const chainTip = await getBlockHeight()
    const { getRange, paging } = redisPageRange(req.query, chainTip, '')
    const start = Math.min(...getRange)
    const end = Math.max(...getRange)
    const blocks = (await getBlocksByHeight(start, end))

    return res.json({ blocks, paging })
  } catch (e) {
    console.error(e)
    return res.sendStatus(500).json(e)
  }
})

router.get('/headers', async (req, res, next) => {
  try {
    const chainTip = await getBlockHeight()
    const { getRange, paging } = redisPageRange(req.query, chainTip, '')
    const start = Math.min(...getRange)
    const end = Math.max(...getRange)
    const headers = (await getBlocksByHeight(start, end)).map(b => {
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
    const chainTip = await getBlockHeight()

    const start = +(req.query.start || 0)
    const end = +(req.query.end || start)
    const step = +(req.query.step || 1)

    let heights = []
    if (start || end) {
      heights = rangeInclusive(start, end)
    } else {
      const fromTip = +(req.query.from_tip || 1)
      heights = rangeInclusive(Math.max(chainTip - fromTip, 0), chainTip)
    }
    heights = heights.filter((_, i) => i % step === 0)

    const data = (await baseNode.GetTokensInCirculation(heights)).map(v => ({
      height: +v.height,
      tokensInCirculation: +v.value
    }))

    return res.json(data)
  } catch (e) {
    console.error(e)
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
