const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const { productName } = require('../package.json');

const isDevMode = process.env.NODE_ENV === 'development';

const config = {
  name: 'main',
  mode: process.env.NODE_ENV || 'production',
  devtool: isDevMode ? 'eval-cheap-module-source-map' : false,
  entry: {
    main: path.join(__dirname, '../src/main/index.js')
  },
  externals: {
    electron: 'commonjs2 electron',
    '@electron/remote': 'commonjs2 @electron/remote',
    'electron-updater': 'commonjs2 electron-updater',
    'irsdk-node': 'commonjs2 irsdk-node',
    sharp: 'commonjs2 sharp'
  },
  module: {
    rules: [
      {
        test: /\.(j|t)s$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  },
  node: {
    __dirname: isDevMode,
    __filename: isDevMode
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.PRODUCT_NAME': JSON.stringify(productName)
    })
  ],
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '../dist')
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.join(__dirname, '../src/'),
      src: path.join(__dirname, '../src/')
    }
  },
  target: 'electron-main'
};

if (isDevMode) {
  config.plugins.push(
    new webpack.DefinePlugin({
      __static: JSON.stringify(path.join(__dirname, '../static').replace(/\\/g, '\\\\'))
    })
  );
} else {
  config.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, '../src/data'),
          to: path.join(__dirname, '../dist/data')
        },
        {
          from: path.join(__dirname, '../static'),
          to: path.join(__dirname, '../dist/static'),
          globOptions: {
            ignore: ['**/.*']
          }
        }
      ]
    })
  );
}

module.exports = config;
