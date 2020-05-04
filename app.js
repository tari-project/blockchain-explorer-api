require('dotenv').config()
const express = require('express')
const path = require('path')
const logger = require('morgan')
const cors = require('cors')
const app = express()

const indexRouter = require('./routes/index')

app.use(cors())
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)

module.exports = app
