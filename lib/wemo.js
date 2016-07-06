const lodash = require("lodash")
const Wemo = require('wemo-client');
const wemo = new Wemo();

function toggleBulb(client, d) {
  return new Promise((resolve, reject) => {
    const nextStatus = +!+d.capabilities[10006]
    console.log(`Turning ${d.friendlyName} ${nextStatus ? 'on' : 'off'}`)
    client.setDeviceStatus(d.deviceId, 10006, nextStatus, (err, res) => {
      err ? reject(err) : setTimeout(resolve, 5000)
    })
  })
}

function getLightSwitchBulbs(client) {
  return new Promise((resolve, reject) => {
    console.log("Getting end devices of %s...", client.device.friendlyName)
    client.getEndDevices((err, devices) => {
      err ? reject(err) : resolve(devices)
    })
  })
}

function toggleAllLightSwitchBulbs(client) {
  return getLightSwitchBulbs(client).then((bulbs) => bulbs.map(toggleBulb.bind(this, client)))
}

module.exports = class {
  constructor(pollInterval = 5000) {
    this.clients = []
    this.discoverDevices()
    setInterval(() => {
      this.discoverDevices()
    }, pollInterval);
  }

  discoverDevices() {
    console.log("Looking for devices...")

    wemo.discover((device) => {
      if (device.deviceType === Wemo.DEVICE_TYPE.Bridge) {
        if (lodash.find(this.clients, ["macAddress", device.macAddress])) {
          return;
        }
        console.log(`Found device ${device.friendlyName}`)
        const client = wemo.client(device);
        this.clients.push(client)
      }
    });
  }

  toggleAll() {
    return Promise.all(this.clients.map(toggleAllLightSwitchBulbs))
  }
}