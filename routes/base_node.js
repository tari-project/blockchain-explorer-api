const express = require('express')
const router = express.Router()
const protos = require('../protos')

/* GET home page. */
router.get('/blocks', async (req, res, next) => {
  const heights = ([].concat(req.query.heights || 1)).map(i => +i)
  const blocks = await protos.blocks.GetBlocks(heights)
  return res.json({ blocks })
})

module.exports = router
