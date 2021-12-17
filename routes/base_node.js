const express = require('express')
const router = express.Router()
const { client: redis } = require('../helpers/redis')

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

function errorObject (name, message) {
  return { error: { name, message } }
}

function sendInternalError (res, e) {
  console.error(e)
  return res.status(500).json(errorObject('internal', 'Internal error'))
}

function sendNotFoundError (res, message = 'Not found') {
  return res.status(404).json(errorObject('not-found', message))
}

function sendBadRequest (res, message = 'Bad request') {
  return res.status(40).json(errorObject('bad-request', message))
}

router.get('/chain-metadata', async (req, res) => {
  try {
    const metadata = await getChainMetadata(req.query.start)
    return res.json(metadata)
  } catch (e) {
    return sendInternalError(res, e)
  }
})

router.get('/kernel/:publicNonce/:signature', async (req, res) => {
  try {
    let { publicNonce, signature } = req.params

    // these must be base64 for GRPC
    publicNonce = Buffer.from(publicNonce, 'hex').toString('base64')
    signature = Buffer.from(signature, 'hex').toString('base64')

    const blocks = await baseNode.SearchKernels([{ publicNonce, signature }])
    return res.json({ blocks })
  } catch (e) {
    return sendInternalError(res, e)
  }
})

router.get('/blocks/:blockId', async (req, res) => {
  try {
    const { blockId } = req.params
    const block = (Number.isInteger(+blockId) ? await getBlocksByHeight(+blockId, +blockId) : await getBlocksByHashes([blockId])).pop()
    if (!block) {
      return sendNotFoundError(res, 'Block not found')
    }
    return res.json(block)
  } catch (e) {
    return sendInternalError(res, e)
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
    return sendInternalError(res, e)
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
    return sendInternalError(res, e)
  }
})

router.get('/transactions', async (req, res) => {
  if (!req.query.from) {
    return sendBadRequest(res, 'query.from is required')
  }

  const from = +req.query.from
  if (isNaN(from)) {
    return sendBadRequest(res, 'query.from must be numeric')
  }

  try {
    const transactions = await getTransactions(from)
    return res.json({ transactions })
  } catch (e) {
    return sendInternalError(res, e)
  }
})

router.get('/calc-timing', async (req, res) => {
  try {
    const data = await baseNode.GetCalcTiming(req.query)
    return res.json(data)
  } catch (e) {
    return sendInternalError(res, e)
  }
})

router.get('/constants', async (_, res) => {
  try {
    const data = await getConstants()
    return res.json(data)
  } catch (e) {
    return sendInternalError(res, e)
  }
})

router.get('/block-size', async (req, res) => {
  try {
    const data = await baseNode.GetBlockSize(req.query)
    return res.json(data)
  } catch (e) {
    return sendInternalError(res, e)
  }
})

router.get('/block-fees', async (req, res) => {
  try {
    const data = await baseNode.GetBlockFees(req.query)
    return res.json(data)
  } catch (e) {
    return sendInternalError(res, e)
  }
})

router.get('/version', async (_, res) => {
  try {
    const data = await baseNode.GetVersion()
    return res.json(data)
  } catch (e) {
    return sendInternalError(res, e)
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
    return sendInternalError(res, e)
  }
})

router.get('/network-difficulty', async (req, res) => {
  try {
    const data = await baseNode.GetNetworkDifficulty(req.query)
    return res.json(data)
  } catch (e) {
    return sendInternalError(res, e)
  }
})

router.get("/healthz", async (_, res) => {
  try {
    await baseNode.GetVersion()
  } catch (e) {
    return sendInternalError(res, `Base node error : ${e}`)
  }
  try {
    if (await redis.ping() != "PONG") {
      return sendInternalError(res, "Redis not running properly!");
    }
  } catch (e) {
    return sendInternalError(res, `Redis error : ${e}`);
  }
  return res.status(200).send({ status: "OK" })
})

module.exports = router
