# skills/desktop-mobile-export.md - Cross-Platform Build & Packaging Guide (Windows .exe & Android .apk)

## 1. Unified Architecture Overview

Silaye compiles from a single Next.js TypeScript codebase into three distinct production targets:
* **Web:** Deployed directly to Edge/Vercel/Node runtime.
* **Desktop (.exe):** Standalone Windows installer packaged with Electron and `electron-builder` (compilable directly from Linux Mint).
* **Mobile (.apk):** Native Android package compiled via Capacitor Android runtime.


```

```
               [ Next.js App Router Codebase ]
                             │
                 `npm run build` (Static Export)
                             │
                     [ `out/` Directory ]
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
[ Electron Container ]                  [ Capacitor Container ]
(Node + Chromium Shell)                 (Android Webview Shell)
         │                                       │
 `electron-builder`                       `npx cap build`
         │                                       │
         ▼                                       ▼

```

Windows Installer (`.exe`)                Android Binary (`.apk`)

```

---

## 2. Next.js Static Export Configuration

Static export compiles pages, Tailwind styles, and React client logic into a self-contained `out/` folder capable of running locally inside Electron and Capacitor webviews.

### 2.1 `next.config.mjs`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for file:// and capacitor:// local asset loading
  },
  // Ensure strict client builds ignore server-only route handlers during export
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

```

---

## 3. Mobile Package Setup (`.apk` via Capacitor)

### 3.1 Dependencies Installation

```bash
npm install @capacitor/core @capacitor/android @capacitor/app-launcher @capacitor/browser
npm install -D @capacitor/cli

```

### 3.2 Configuration (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.silaye.app',
  appName: 'Silaye',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true, // Allows local LAN printer discovery
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0B0C0E', // Matches Obsidian Dark theme
  },
};

export default config;

```

### 3.3 Android Platform Scaffolding & Sync

```bash
# 1. Build static export
npm run build

# 2. Initialize and add Android platform
npx cap add android

# 3. Synchronize assets and plugins
npx cap sync android

```

### 3.4 Local APK Compilation Commands

* **Debug APK Generation (Linux CLI):**
```bash
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

```


* **Direct USB Testing on Physical Phone (Zero Laptop RAM Load):**
```bash
# Enable USB Debugging on phone and run:
npx cap run android --target <device-id>

```



---

## 4. Windows Desktop Installer (`.exe` via Electron)

### 4.1 Dependencies Installation

```bash
npm install -D electron electron-builder wait-on concurrently

```

### 4.2 Electron Main Process (`electron/main.cjs`)

```javascript
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Silaye Workshop Command System',
    backgroundColor: '#0B0C0E',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../out/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
  }

  // Handle external links (WhatsApp wa.me links open in default web browser)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for External Shell & System Calls
ipcMain.handle('open-external-url', async (_, targetUrl) => {
  await shell.openExternal(targetUrl);
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

```

### 4.3 Secure Preload Bridge (`electron/preload.cjs`)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
});

```

### 4.4 `electron-builder` Configuration (`package.json`)

```json
{
  "build": {
    "appId": "com.silaye.desktop",
    "productName": "Silaye",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "out/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Silaye Workshop"
    }
  }
}

```

### 4.5 Compiling Windows `.exe` on Linux Mint

`electron-builder` can package Windows binaries directly on Linux Mint without needing Windows installed:

```bash
# 1. Install Wine & Mono (one-time requirement for Linux NSIS builds)
sudo apt update && sudo apt install -y wine64 mono-devel

# 2. Build Next.js static files
npm run build

# 3. Compile Windows .exe Installer
npx electron-builder --win nsis --x64
# Output: dist-electron/Silaye Setup 1.0.0.exe

```

---

## 5. Automated Cloud Compilation via GitHub Actions (CI/CD)

To avoid local thermal throttling or high RAM usage on local developer machines, use GitHub cloud runners to build both `.exe` and `.apk` binaries on every Git tag release.

### 5.1 `.github/workflows/build-artifacts.yml`

```yaml
name: Build Cross-Platform Binaries

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows-exe:
    runs-on: windows-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Next.js Static Export
        run: npm run build

      - name: Package Windows Installer
        run: npx electron-builder --win nsis --x64

      - name: Upload Windows .exe Artifact
        uses: actions/upload-artifact@v4
        with:
          name: silaye-windows-installer
          path: dist-electron/*.exe

  build-android-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Setup Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install Dependencies
        run: npm ci

      - name: Build Static Web Assets
        run: npm run build

      - name: Sync Capacitor Android
        run: |
          npx cap add android || true
          npx cap sync android

      - name: Build Android Debug APK
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload Android APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: silaye-android-apk
          path: android/app/build/outputs/apk/debug/*.apk

```

---

## 6. Unified NPM Scripts Configuration

Add these scripts to `package.json` for rapid workflow execution:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "export:clean": "rm -rf out dist-electron android/app/build",
    "mobile:sync": "npm run build && npx cap sync android",
    "mobile:run": "npm run build && npx cap run android",
    "desktop:dev": "concurrently \"next dev\" \"wait-on http://localhost:3000 && electron electron/main.cjs\"",
    "desktop:build": "npm run build && electron-builder --win nsis --x64"
  }
}

```

```

```
