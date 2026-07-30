const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

// Initialize electron-store for persisting settings
const store = new Store();

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the web app
  // Option 1: Load from local build (for production)
  // mainWindow.loadFile(path.join(__dirname, 'web-build', 'index.html'));
  
  // Option 2: Load from development server (for development)
  // mainWindow.loadURL('http://localhost:3000');
  
  // Option 3: Load from production URL (recommended)
  mainWindow.loadURL('https://vyaparvistar.a2wares.com');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates silently
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Sale',
          accelerator: 'F1',
          click: () => mainWindow.webContents.send('menu-action', 'new-sale')
        },
        {
          label: 'Print',
          accelerator: 'F2',
          click: () => mainWindow.webContents.send('menu-action', 'print')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.vyaparvistar.com')
        },
        {
          label: 'Check for Updates',
          click: () => autoUpdater.checkForUpdatesAndNotify()
        },
        {
          label: 'About',
          click: () => {
            shell.openExternal('https://vyaparvistar.a2wares.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================
// IPC Handlers (Desktop Features)
// ============================================

// Get machine ID
ipcMain.handle('get-machine-id', async () => {
  try {
    const machineId = require('node-machine-id').machineIdSync();
    return { success: true, machineId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get list of connected printers
ipcMain.handle('get-printers', async () => {
  try {
    // For Windows, we can use WMI or read from registry
    // For now, return a placeholder - will need actual implementation
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // Windows: Get printers using PowerShell
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execPromise(
          'powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName | ConvertTo-Json"'
        );
        const printers = JSON.parse(stdout);
        return { 
          success: true, 
          printers: printers.map(p => ({
            name: p.Name,
            driver: p.DriverName,
            port: p.PortName,
            status: 'ready'
          }))
        };
      } catch (error) {
        return { success: false, error: 'Failed to get printers' };
      }
    }
    
    // Mac: Get printers using lpstat
    if (process.platform === 'darwin') {
      try {
        const { stdout } = await execPromise('lpstat -p -d');
        // Parse output - simplified
        return { 
          success: true, 
          printers: [{ name: 'Default Printer', status: 'ready' }] 
        };
      } catch (error) {
        return { success: false, error: 'Failed to get printers' };
      }
    }
    
    return { success: false, error: 'Unsupported platform' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Print silently (no dialog)
ipcMain.handle('print-silent', async (event, printerName, content, options = {}) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // For thermal printers, we need to send ESC/POS commands
    // This is a simplified version - actual implementation will be more complex
    
    if (process.platform === 'win32') {
      // Windows: Use PowerShell to print
      const { stdout } = await execPromise(
        `powershell -Command "Add-Type -AssemblyName System.Drawing; $content | Out-Printer -Name '${printerName}'"`
      );
      return { success: true };
    }
    
    return { success: false, error: 'Printing not implemented for this platform' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open file dialog
ipcMain.handle('open-file-dialog', async (event, options = {}) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled) {
    return { success: false, canceled: true };
  }
  
  return { success: true, filePaths: result.filePaths };
});

// Save file dialog
ipcMain.handle('save-file-dialog', async (event, options = {}) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath || 'untitled',
    filters: options.filters || [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled) {
    return { success: false, canceled: true };
  }
  
  return { success: true, filePath: result.filePath };
});

// Get app data path
ipcMain.handle('get-app-data-path', async () => {
  const { app } = require('electron');
  return app.getPath('userData');
});

// Store data locally (for offline mode)
ipcMain.handle('store-set', async (event, key, value) => {
  try {
    store.set(key, value);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('store-get', async (event, key) => {
  try {
    const value = store.get(key);
    return { success: true, value };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  console.log('Update available');
});

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded');
  // Show notification to user
  mainWindow.webContents.send('update-downloaded');
});

// Handle menu actions from renderer
ipcMain.on('menu-action', (event, action) => {
  console.log('Menu action:', action);
  // Handle menu actions here
});

console.log('VyaparVistar Desktop App started');