#!/usr/bin/env node

const os = require("os")
const path = require("path")
const fs = require("fs")
const program = require('commander');
const lodash = require("lodash")

const Engine = require("./../lib/engine")
const Wemo = require("../lib/wemo")

const configFile = path.join(os.homedir(), ".weclap.json")

program
  .version(require("../package.json").version)

program
  .command('start')
  .option('-c, --claps <n>', 'Number of claps required to trigger action', parseInt, 2)
  .option('-i, --interval <n>', 'Detection interval', parseInt, 1000)
  .description('starts weclap')
  .action((options) => {
    if (!fs.existsSync((configFile))) {
      console.log("weclap configuration not found, please run 'weclap setup' first")
      process.exit(-1)
    }

    const engine = new Engine(require(configFile))
    const wemo = new Wemo()

    let isBusy = false


    engine.start()
    engine.onClap(() => {
      if (isBusy) {
        console.log("Clap ignored.")
      } else {
        console.log("Clap detected!")
        isBusy = true
        wemo.toggleAll().then(() => {
          isBusy = false
        }, (err) => console.log(err))
      }
    }, options.claps, options.interval);
  })

program
  .command('setup')
  .description('trains and saves clap detection settings')
  .action(() => {
    const engine = new Engine()
    const samples = []
    const keys = [
      "Length (seconds)",
      "Maximum amplitude",
      "Mean norm",
      "Mean amplitude",
      "RMS amplitude",
      "Maximum delta",
      "Mean delta",
      "RMS delta",
      "Rough frequency"
    ]
    engine.isClap = (frame) => {
      samples.push(frame)
      const stats = {}

      keys.forEach((key) => {
        stats[key] = [
          Math.floor(lodash.min(lodash.map(samples, key)) * 1000) / 1000,
          Math.ceil(lodash.max(lodash.map(samples, key)) * 1000) / 1000,
        ]
      })
      console.log(stats)
      fs.writeFileSync(configFile, JSON.stringify(stats))
    }

    console.log("clap many times to train weclap. press ctrl-c when done.")
    engine.start()
  })

program.parse(process.argv);
