const WebSocket = require('ws')
const { ACTIONS } = require('./constants')

class Sockets {
  constructor (server, app) {
    this.wss = new WebSocket.Server({ server, path: '/ws' })
    this.app = app

    this.onConnection()
  }

  onConnection () {
    const app = this.app
    this.wss.on('connection', (ws) => {
      console.log('Connection stated')
      // connection is up, let's add a simple simple event
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

  newBlock (command, ws, app) {

  }
  // fileList (command, ws, app) {
  //   ws.send(JSON.stringify({
  //     action: ACTIONS.ACTION_FILE_LIST,
  //     value: files.listFiles(app._filesPath).map(i => `${process.env.PUBLIC_URL}/files/${i}`)
  //   }))
  // }
  //
  // streamAdd (command, ws, app) {
  //   const config = app._config
  //   let error
  //   const value = config.addStream(command)
  //   if (!value) {
  //     error = 'There was an error adding the stream'
  //   }
  //   ws.send(JSON.stringify({
  //     action: ACTIONS.ACTION_STREAM_ADD,
  //     error,
  //     value
  //   }))
  // }
  //
  // streamList (command, ws, app) {
  //   ws.send(JSON.stringify({
  //     action: ACTIONS.ACTION_STREAM_LIST,
  //     error: false,
  //     value: app._config.streams
  //   }))
  // }
  //
  // castDeviceList (command, ws, _app) {
  //   const devices = this.cast.devices
  //   const deviceList = Object.keys(devices).map(deviceId => ({
  //     friendlyName: devices[deviceId].friendlyName,
  //     deviceId: devices[deviceId].host
  //   }))
  //   ws.send(JSON.stringify({
  //     action: ACTIONS.ACTION_CAST_DEVICE_LIST,
  //     value: deviceList
  //   }))
  // }
  //
  // castStart (command, ws, _app) {
  //   const { url, deviceId } = command
  //   this.cast.castMedia(deviceId, url, (error, device) => {
  //     ws.send(JSON.stringify({
  //       action: ACTIONS.ACTION_CAST_START,
  //       error,
  //       value: `Playing ${url} on your ${device.friendlyName}`
  //     }))
  //   })
  // }
  //
  // castStop (command, ws, _app) {
  //   const { deviceId } = command
  //   this.cast.castStop(deviceId, (error, device) => {
  //     ws.send(JSON.stringify({
  //       action: ACTIONS.ACTION_CAST_STOP,
  //       error,
  //       value: `Stopping ${device.friendlyName}`
  //     }))
  //   })
  // }
  //
  // castList (command, ws, app) {
  //   app._config.casts.forEach(c => {
  //     this.cast.castStatus(c.deviceId, () => {})
  //   })
  //
  //   ws.send(JSON.stringify({
  //     action: ACTIONS.ACTION_CAST_LIST,
  //     error: false,
  //     value: app._config.casts
  //   }))
  // }
}

module.exports = Sockets
