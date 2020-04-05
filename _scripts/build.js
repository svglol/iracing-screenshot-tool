const os = require('os')
const builder = require('electron-builder')

const Platform = builder.Platform
const { name, productName } = require('../package.json')

let targets
var platform = os.platform()

if (platform == 'darwin') {
  targets = Platform.MAC.createTarget()
} else if (platform == 'win32') {
  targets = Platform.WINDOWS.createTarget()
} else if (platform == 'linux') {
  targets = Platform.LINUX.createTarget()
}

const config = {
  appId: `com.svglol.${name}`,
  // asar: false,
  // compression: 'store',
  productName,
  directories: {
    output: './build/',
  },
  files: ['static/icon.*', './dist/**/*', '!./dist/web/**/*'],
  win: {
    icon: 'static/icon.png',
    target: ['nsis', 'portable'],
  },
  nsis: {
    allowToChangeInstallationDirectory: true,
    oneClick: false,
  },
}

builder
  .build({
    targets,
    config,
  })
  .then((m) => {
    console.log(m)
  })
  .catch((e) => {
    console.error(e)
  })
