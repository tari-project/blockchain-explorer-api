const { adminToken } = require('../config')
function simpleAuth (req, res, next) {
  const token = req.query.token || 'invalid'
  if (token !== adminToken) {
    return res.status(401).json({
      error: 'Unauthorized access'
    })
  }
  return next()
}

module.exports = {
  simpleAuth
}
