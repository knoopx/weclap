const {spawn} = require('child_process');
const os = require('os');
const lodash = require("lodash")

module.exports = class {
  constructor(config = {}) {
    this.args = ({
      'Linux': ['-t', 'alsa', 'hw:1,0'],
      'Windows_NT': ['-t', 'waveaudio', '-d'],
      'Darwin': ['-t', 'coreaudio', 'default']
    })[os.type()].concat([
      "-n",
      "--no-show-progress",
      "silence", "1", "0.0001", "10%", "1", "0.1", "10%",
      "norm",
      "stat"
    ])

    this.isRunning = false
    this.history = []
    this.listeners = []
    this.config = config
  }

  start(chain) {
    if (this.isRunning) {
      return chain("Already running");
    }
    this.isRunning = true;
    this._record(chain);
  }

  stop() {
    this.isRunning = false;
    if (this.recorder) {
      this.recorder.kill();
      this.recorder = null;
    }
  }

  onClap(fn, expectedClaps = 1, interval = 1000) {
    this.listeners.push([fn, expectedClaps, interval])
  }

  isClap(frame) {
    return lodash.every(Object.keys(this.config), (key) => {
      const [min, max] = this.config[key]
      const lowMatch = frame[key] > min
      const upperMatch = frame[key] < max
      if (!(lowMatch && upperMatch)) {
        console.log("%s: %s is out of range %s..%s", key, frame[key], min, max)
      }
      return lowMatch && upperMatch
    })
  }

  _handleClap() {
    this.history.push(Date.now())
    if (this.history.length > 10) {
      this.history.shift()
    }
    this.listeners.forEach((listener) => {
      const [fn, expectedClaps, interval] = listener
      const lastAt = this.history[this.history.length - 1];
      const runningClaps = this.history.filter(clapTime => {
        return lastAt - clapTime <= interval
      })
      if (runningClaps.length == expectedClaps) {
        fn()
      }
    });
  }

  _record(chain) {
    if (!this.isRunning) {
      return chain("Listener not running");
    }

    let body = "";
    this.recorder = spawn("sox", this.args);
    this.recorder.stderr.on("data", function (buf) {
      body += buf;
    });

    this.recorder.on("exit", () => {
      if (this.isClap(this._parse(body))) {
        this._handleClap()
      }
      this._record(chain);
    });
  }

  _parse(body) {
    return body.match(/[^\r\n]+/g).reduce((obj, l) => {
      const [key, value] = l.split(":")
      obj[key.replace(/\s+/, " ").trim()] = parseFloat(value)
      return obj
    }, {})
  }
};