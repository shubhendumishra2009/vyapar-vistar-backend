# VyaparVistar Desktop App

Electron-based desktop application for VyaparVistar business management software.

## Features

- ✅ **Same UI as web app** - Familiar interface
- ✅ **Silent printing** - Print directly to thermal printers without dialog
- ✅ **Machine ID detection** - Auto-identify each computer
- ✅ **Printer auto-detection** - Automatically detect connected printers
- ✅ **Keyboard shortcuts** - F1 (New Sale), F2 (Print), F12 (Dev Tools)
- ✅ **Auto-updates** - Like VS Code, updates automatically
- ✅ **Offline mode** - Works without internet (data syncs when online)
- ✅ **System tray** - Minimize to tray for quick access

## Requirements

- Node.js 18+ 
- npm or yarn
- Windows 10+ / macOS 10.15+ / Linux

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build:win  # Windows
npm run build:mac  # macOS
```

## Project Structure

```
desktop/
├── main.js           # Main process (Node.js backend)
├── preload.js        # Security bridge (IPC)
├── package.json      # App configuration
├── assets/           # Icons and images
│   ├── icon.ico      # Windows icon
│   └── icon.icns     # macOS icon
└── dist/             # Built installers
    ├── VyaparVistar Setup.exe
    └── VyaparVistar.dmg
```

## How It Works

```
┌──────────────────────────────────────────┐
│  Main Process (Node.js)                  │
│  - Window management                     │
│  - Printer detection                     │
│  - Silent printing                       │
│  - File system access                    │
└──────────────┬───────────────────────────┘
               │ IPC
┌──────────────▼───────────────────────────┐
│  Renderer Process (React Web App)        │
│  - Same code as web version              │
│  - Calls window.electronAPI.xxx          │
└──────────────────────────────────────────┘
```

## Desktop-Specific APIs

The web app can access these desktop features:

```javascript
// Check if running in desktop app
if (window.electronAPI) {
  // Get machine ID
  const { machineId } = await window.electronAPI.getMachineId();
  
  // Get connected printers
  const { printers } = await window.electronAPI.getPrinters();
  
  // Print silently (no dialog)
  await window.electronAPI.printSilent('EPSON TM-T88V', invoiceHTML);
  
  // Open file dialog
  const { filePaths } = await window.electronAPI.openFileDialog();
}
```

## Building Installers

### Windows
```bash
npm run build:win
```
Output: `dist/VyaparVistar Setup.exe`

### macOS
```bash
npm run build:mac
```
Output: `dist/VyaparVistar.dmg`

### All Platforms
```bash
npm run dist
```

## Auto-Updates

The app checks for updates automatically on startup. When an update is available:
1. User sees notification: "Update available (v1.1)"
2. User clicks "Update"
3. App downloads and restarts automatically

Updates are served from your server via GitHub Releases or custom server.

## Distribution

1. **Upload installers** to your server:
   - `https://vyaparvistar.com/download/windows`
   - `https://vyaparvistar.com/download/mac`

2. **Add download button** to web app:
   ```jsx
   <a href="https://vyaparvistar.com/download/windows">
     Download Desktop App
   </a>
   ```

3. **Users download and install**:
   - Click download button
   - Run installer
   - App opens automatically

## Development

### Prerequisites
```bash
# Install Electron globally
npm install -g electron
npm install -g electron-builder
```

### Running in Development
```bash
npm install
npm start
```

### Debugging
- Press F12 to open DevTools
- View console logs in terminal
- Check IPC calls in DevTools console

## Packaging for Production

1. Update version in `package.json`
2. Build installers: `npm run build:win` or `npm run build:mac`
3. Upload to server or GitHub Releases
4. Update download links in web app

## Troubleshooting

### "Cannot find module" errors
```bash
# Delete and reinstall node_modules
rm -rf node_modules
npm install
```

### Printer not detected
- Check if printer is installed in Windows/Mac
- Run `Get-Printer` in PowerShell (Windows)
- Check printer permissions

### App won't start
- Check Node.js version: `node --version` (should be 18+)
- Check Electron version: `npx electron --version`
- View logs in terminal

## License

MIT © A2Wares