const express = require('express')
const router = express.Router()
const protos = require('../protos')

router.get('/blocks', async (req, res, next) => {
  const heights = ([].concat(req.query.heights || 1)).map(i => +i)
  try {
    const blocks = await protos.baseNode.GetBlocks(heights)
    return res.json({ blocks })
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})

router.get('/headers', async (req, res, next) => {
  try {
    const headers = await protos.baseNode.ListHeaders(req.query)
    return res.json({ headers })
  } catch (e) {
    return res.sendStatus(500).json(e)
  }
})
module.exports = router
