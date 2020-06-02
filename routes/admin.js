const express = require('express')
const router = express.Router()
const redis = require('../helpers/redis')
const { simpleAuth } = require('../middleware/auth')
const { baseNode } = require('../protos')
const {

  syncBlocks,
  syncDifficulties
} = require('../helpers/sync')

router.post('/proto', simpleAuth, async (req, res) => {
  const result = await baseNode._checkVersion(req.query.update)
  return res.json(result)
})

router.post('/flush', simpleAuth, async (req, res) => {
  redis.flushall()
  return res.status(202).json({
    status: 'OK',
    message: 'Flush ALL initiated'
  })
})

router.post('/sync', simpleAuth, async (req, res) => {
  syncBlocks()
  syncDifficulties()
  // syncHeaders()
  return res.status(202).json({
    status: 'OK',
    message: 'Sync initiated.'
  })
})

router.get('/status', simpleAuth, async (req, res) => {
  const grpc = {
    status: false,
    message: null
  }
  try {
    grpc.message = await baseNode.GetVersion()
    grpc.status = true
  } catch (e) {
    grpc.message = e
  }
  const redisStatus = {
    status: false,
    message: null
  }
  try {
    redisStatus.status = redis._client.connected
  } catch (e) {
    redisStatus.message = e
  }
  const status = {
    grpc,
    redis: redisStatus
  }

  return res.json(status)
})
module.exports = router
