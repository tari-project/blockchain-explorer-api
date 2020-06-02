require('dotenv').config()
const path = require('path')
const express = require('express')
const logger = require('morgan')
const cors = require('cors')
const cron = require('./helpers/cron')
const { noCron } = require('./config')
if (!noCron) {
  cron.schedule()
}

const app = express()

app.use(cors())
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use(express.static(path.join(__dirname, 'public')))

/** Routes */
const baseNodeRouter = require('./routes/base_node')
const adminRouter = require('./routes/admin')

app.use('/', baseNodeRouter)
app.use('/admin', adminRouter)

module.exports = app
