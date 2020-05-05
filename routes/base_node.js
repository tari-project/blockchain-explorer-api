const express = require('express')
const router = express.Router()
const protos = require('../protos')

router.get('/blocks', async (req, res, next) => {
  const heights = ([].concat(req.query.heights || 1)).map(i => +i)
  const blocks = await protos.baseNode.GetBlocks(heights)
  return res.json({ blocks })
})

router.get('/headers', async (req, res, next) => {
  const headers = await protos.baseNode.ListHeaders(req.query)
  return res.json({ headers })
})
module.exports = router
