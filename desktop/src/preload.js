'use strict'

// Minimal preload: expose safe version info to the renderer.
// Future: settings (API key -> Keychain) IPC will be exposed here.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('dshDesktop', {
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
})
