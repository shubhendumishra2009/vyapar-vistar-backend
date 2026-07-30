const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  
  // ============================================
  // Printer APIs
  // ============================================
  
  // Get list of connected printers
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // Print silently (no dialog) - for thermal printers
  printSilent: (printerName, content, options) => 
    ipcRenderer.invoke('print-silent', printerName, content, options),
  
  // Print with dialog (fallback)
  printWithDialog: (options) => 
    ipcRenderer.invoke('print-with-dialog', options),

  // ============================================
  // System APIs
  // ============================================
  
  // Get unique machine ID
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  
  // Get app data path (for local storage)
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  
  // Get platform (win32, darwin, linux)
  getPlatform: () => process.platform,

  // ============================================
  // File System APIs
  // ============================================
  
  // Open file dialog
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  
  // Save file dialog
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  
  // Read file
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // Write file
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),

  // ============================================
  // Storage APIs (Local Storage)
  // ============================================
  
  // Store data locally (for offline mode)
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  
  // Get stored data
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  
  // Remove stored data
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  
  // Clear all stored data
  storeClear: () => ipcRenderer.invoke('store-clear'),

  // ============================================
  // App APIs
  // ============================================
  
  // Get app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Check if app is running in Electron
  isElectron: true,
  
  // Listen for menu actions (F1, F2, etc.)
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
  },
  
  // Listen for update events
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', () => callback());
  },
  
  // Remove listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// Log when preload is ready
console.log('Preload script loaded - electronAPI available');