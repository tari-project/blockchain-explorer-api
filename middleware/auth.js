function simpleAuth (req, res, next) {
  const token = req.query.token || 'invalid'
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized access'
    })
  }
  return next()
}

module.exports = {
  simpleAuth
}
