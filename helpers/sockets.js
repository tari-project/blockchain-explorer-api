const WebSocket = require('ws')

class Sockets {
  constructor (server, app) {
    this.wss = new WebSocket.Server({ server, path: '/ws' })
    this.app = app

    this.onConnection()
  }

  onConnection () {
    const app = this.app
    this.wss.on('connection', (ws, req) => {
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      console.log('Connection started', ip)
      ws.on('message', (message) => {
        try {
          const command = JSON.parse(message)
          const { action } = command
          this[`${action}`](command, ws, app)
        } catch (error) {
          ws.send(JSON.stringify({ error }))
        }
      })
      this.onClientConnected(ws)
    })
  }

  onClientConnected (ws) {
    // const app = this.app
    console.log('Client connected')
  }

  broadcast (message) {
    this.wss.clients.forEach(client => {
      client.send(JSON.stringify(message))
    })
  }
}

module.exports = Sockets
