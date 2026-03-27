process.env.NODE_ENV = 'development';

const chalk = require('chalk');
const electron = require('electron');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const kill = require('tree-kill');
const path = require('path');
const { spawn } = require('child_process');

const mainConfig = require('./webpack.main.config');
const rendererConfig = require('./webpack.renderer.config');

let electronProcess = null;
let manualRestart = false;
const remoteDebugging = process.argv.includes('--remote-debug');

if (remoteDebugging) {
  process.env.RENDERER_REMOTE_DEBUGGING = true;
}

function killElectron(pid) {
  return new Promise((resolve, reject) => {
    if (!pid) {
      resolve();
      return;
    }

    kill(pid, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

async function restartElectron() {
  console.log(chalk.gray('\nStarting electron...'));

  const { pid } = electronProcess || {};
  await killElectron(pid);

  const args = [path.join(__dirname, '../dist/main.js')].filter(Boolean);

  if (remoteDebugging) {
    args.push('--inspect=9222', '--remote-debugging-port=9223');
  }

  electronProcess = spawn(electron, args);

  electronProcess.stdout.on('data', (data) => {
    console.log(chalk.white(data.toString()));
  });

  electronProcess.stderr.on('data', (data) => {
    console.error(chalk.red(data.toString()));
  });

  electronProcess.on('exit', () => {
    if (!manualRestart) {
      process.exit(0);
    }
  });
}

function startMain() {
  const webpackSetup = webpack([mainConfig]);

  webpackSetup.compilers.forEach((compiler) => {
    compiler.hooks.done.tap('done', async () => {
      console.log(chalk.gray(`\nCompiled ${compiler.name} script!`));

      manualRestart = true;
      await restartElectron();

      setTimeout(() => {
        manualRestart = false;
      }, 1500);

      console.log(chalk.gray(`\nWatching file changes for ${compiler.name} script...`));
    });
  });

  webpackSetup.watch(
    {
      aggregateTimeout: 500
    },
    (err) => {
      if (err) {
        console.error(chalk.red(err));
      }
    }
  );
}

function startRenderer(callback) {
  const compiler = webpack(rendererConfig);

  compiler.hooks.done.tap('done', () => {
    console.log(chalk.gray(`\nCompiled ${compiler.name} script!`));
    console.log(chalk.gray(`\nWatching file changes for ${compiler.name} script...`));
  });

  const server = new WebpackDevServer(
    {
      port: 9080,
      static: {
        directory: path.join(__dirname, '../')
      },
      hot: true,
      client: {
        logging: 'warn',
        overlay: true
      }
    },
    compiler
  );

  server.startCallback((err) => {
    if (err) {
      console.error(chalk.red(err));
      return;
    }

    callback();
  });
}

startRenderer(startMain);
