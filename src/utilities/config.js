'use strict';
const Store = require('electron-store');
const homedir = require('os').homedir();
const dir = homedir + '\\Pictures\\Screenshots\\';

const schema = {
  customHeight: {
    type: 'number',
    default: 1080
  },
  customWidth: {
    type: 'number',
    default: 1920
  },
  resolution: {
    type: 'string',
    default: '1080p'
  },
  crop: {
    type: 'boolean',
    default: true,
  },
  winPosX: {
    type: 'number',
    default: 0,
  },
  winPosY: {
    type: 'number',
    default: 0,
  },
  winWidth: {
    type: 'number',
    default: 1100,
  },
  winHeight: {
    type: 'number',
    default: 655,
  },
  screenshotFolder: {
    type: 'string',
    default: dir,
  },
  screenshotKeybind: {
    type: 'string',
    default: 'Control+PrintScreen',
  },
  disableTooltips:{
    type: 'boolean',
    default: false,
  },
  defaultScreenWidth:{
    type:'number',
    default: 0
  },
  defaultScreenHeight:{
    type:'number',
    default: 0
  }
};


module.exports = new Store({schema});
