const { app, BrowserWindow } = require('electron')

const START_URL = process.env.ELECTRON_START_URL ?? 'http://localhost:5173'

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Retry until the Vite dev server is up.
  win.webContents.on('did-fail-load', () => {
    setTimeout(() => win.loadURL(START_URL), 1000)
  })

  win.loadURL(START_URL)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
