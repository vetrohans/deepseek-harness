'use strict'

/**
 * DSH Desktop main process.
 *
 * Boots the dsh web server (spawned child process) and shows it in a
 * BrowserWindow. The dsh server prints a readiness line:
 *     dsh web: http://127.0.0.1:<port>
 * We use `--port 0` so the OS picks a free port and we parse the actual URL.
 */

const { app, BrowserWindow, dialog, shell } = require('electron')
const { spawn } = require('node:child_process')
const http = require('node:http')
const path = require('node:path')
const fs = require('node:fs')

const DEV_MODE = !app.isPackaged
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const RUNTIME_DIR = DEV_MODE
  ? REPO_ROOT
  : path.join(process.resourcesPath, 'dsh-runtime')

const HOST = '127.0.0.1'
const URL_LINE_RE = /dsh web: (https?:\/\/\S+)/

let serverProcess = null
let mainWindow = null
let quitting = false

/** Resolve how to launch the dsh web server in dev vs packaged mode. */
function resolveLaunch() {
  if (DEV_MODE) {
    // Dev: run straight from the repo checkout via corepack pnpm.
    return {
      command: 'corepack',
      args: ['pnpm', 'dsh', 'web', '--host', HOST, '--port', '0'],
      cwd: REPO_ROOT,
    }
  }
  // Packaged: run the compiled CLI with a bundled Node (or Electron's Node as
  // a fallback) from resources/dsh-runtime.
  const bundledNode = path.join(RUNTIME_DIR, 'node', 'bin', 'node')
  const cliEntry = path.join(RUNTIME_DIR, 'apps', 'cli', 'lib', 'bin.js')
  const nodeBin = fs.existsSync(bundledNode) ? bundledNode : process.execPath
  return {
    command: nodeBin,
    args: [cliEntry, 'web', '--host', HOST, '--port', '0'],
    cwd: RUNTIME_DIR,
  }
}

/** Poll a URL until it answers or the timeout elapses. */
function waitForHttp(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const target = new URL(url)
    const tick = () => {
      const req = http.get(
        { host: target.hostname, port: target.port, path: '/' },
        (res) => {
          res.resume()
          resolve()
        },
      )
      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`server did not become ready within ${timeoutMs}ms`))
        } else {
          setTimeout(tick, 300)
        }
      })
      req.setTimeout(2000, () => req.destroy(new Error('timeout')))
    }
    tick()
  })
}

function startServer() {
  const { command, args, cwd } = resolveLaunch()
  console.log(`[desktop] starting dsh web: ${command} ${args.join(' ')} (cwd=${cwd})`)
  serverProcess = spawn(command, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })

  serverProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString()
    process.stdout.write(`[dsh] ${text}`)
    const m = text.match(URL_LINE_RE)
    if (m) onReady(m[1])
  })
  serverProcess.stderr.on('data', (chunk) => process.stderr.write(`[dsh] ${chunk}`))

  serverProcess.on('exit', (code, signal) => {
    serverProcess = null
    if (!quitting) {
      dialog.showErrorBox(
        'DSH 服务异常退出',
        `dsh web 进程已退出 (code=${String(code)}, signal=${String(signal)})。\n应用即将关闭。`,
      )
      app.quit()
    }
  })
}

async function onReady(url) {
  if (mainWindow) return
  try {
    await waitForHttp(url, 30000)
  } catch (err) {
    dialog.showErrorBox('DSH 启动失败', String(err.message || err))
    app.quit()
    return
  }
  console.log(`[desktop] ready at ${url}`)
  createWindow(url)
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'DSH Desktop',
    backgroundColor: '#0b0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.loadURL(url)

  // Smoke-test mode (DSH_SMOKE=1): auto-quit shortly after the page loads.
  if (process.env.DSH_SMOKE === '1') {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('[desktop] smoke: page loaded')
      setTimeout(() => app.quit(), 3000)
    })
  }

  // Open external links in the default browser, never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(new URL(url).origin)) {
      event.preventDefault()
      shell.openExternal(target)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    app.quit()
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    console.log(`[desktop] electron ${process.versions.electron}, node ${process.versions.node}, dev=${DEV_MODE}`)
    startServer()
  })

  app.on('window-all-closed', () => app.quit())
  app.on('before-quit', () => {
    quitting = true
    if (serverProcess) serverProcess.kill('SIGTERM')
  })
}
