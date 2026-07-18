# Android Installation Guide

## 📱 **Method 1: Development Build (Recommended)**

### **Step 1: Install Android Studio**
1. Download Android Studio from https://developer.android.com/studio
2. Install it on your computer
3. Open Android Studio and complete initial setup
4. Install Android SDK (API 33 or higher)

### **Step 2: Enable USB Debugging on Phone**
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go to **Settings** → **Developer Options**
4. Enable **USB Debugging**
5. Enable **USB Installation** (if available)

### **Step 3: Connect Phone to Computer**
1. Connect your Android phone via USB cable
2. Allow USB debugging when prompted
3. Verify connection:
   ```bash
   adb devices
   ```
   You should see your device listed

### **Step 4: Build and Install App**

#### **Option A: Direct Run (Easiest)**
```bash
cd d:/Projects/VyaparVistar
npm start
```
In another terminal:
```bash
cd d:/Projects/VyaparVistar
npm run android
```

#### **Option B: Generate APK**
```bash
cd d:/Projects/VyaparVistar
npx react-native build-android --mode=release
```

### **Step 5: Install APK**
1. Find APK in: `android/app/build/outputs/apk/release/app-release.apk`
2. Copy APK to your phone
3. Install using file manager or browser

---

## 📱 **Method 2: Using Expo (Simpler)**

### **Step 1: Install Expo CLI**
```bash
npm install -g @expo/cli
```

### **Step 2: Create Expo Version**
```bash
cd d:/Projects/VyaparVistar
npx create-expo-app --template blank-typescript RetailERP-Expo
```

### **Step 3: Copy Source Files**
Copy all files from `src/` to new Expo project

### **Step 4: Install on Phone**
```bash
cd RetailERP-Expo
npm install
npx expo start
```
- Scan QR code with phone camera
- Install Expo Go app from Play Store
- Open scanned link in Expo Go

---

## 📱 **Method 3: APK Distribution**

### **Step 1: Fix Dependencies First**
```bash
cd d:/Projects/VyaparVistar
npm install babel-plugin-module-resolver --save-dev
```

### **Step 2: Generate Release APK**
```bash
cd d:/Projects/VyaparVistar
npx react-native build-android --mode=release
```

### **Step 3: Distribute APK**
1. APK location: `android/app/build/outputs/apk/release/app-release.apk`
2. Share via:
   - Email attachment
   - WhatsApp
   - USB transfer
   - Cloud storage (Google Drive, Dropbox)

---

## 🔧 **Required Android Permissions**

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
```

---

## 🌐 **Network Configuration**

### **For Local Testing**
Update `src/services/APIService.js`:
```javascript
this.baseURL = 'http://YOUR_COMPUTER_IP:5000/api';
```

Find your computer's IP:
```bash
ipconfig
```

### **For Production**
```javascript
this.baseURL = 'https://your-server.com/api';
```

---

## 📱 **Installation Steps Summary**

### **Quick Start:**
1. **Install Android Studio**
2. **Enable USB Debugging** on phone
3. **Connect phone** to computer
4. **Run**: `npm run android`
5. **App installs** automatically

### **Alternative:**
1. **Generate APK**: `npx react-native build-android`
2. **Transfer APK** to phone
3. **Install manually**

---

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **Metro not starting**
   ```bash
   npx react-native start --reset-cache
   ```

2. **Device not detected**
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

3. **Build failed**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

4. **Network connection issues**
   - Check phone and computer are on same WiFi
   - Update server URL in APIService.js
   - Test backend health: http://YOUR_IP:5000/api/health

### **Debug Mode:**
```bash
npx react-native run-android --variant=debug
```

---

## 📱 **After Installation**

1. **Start Backend Server**:
   ```bash
   cd d:/Projects/VyaparVistar/backend
   npm run dev
   ```

2. **Test Login**:
   - Username: `admin`
   - Password: `admin123`

3. **Test Sync**:
   - Add product/customer
   - Check if syncs to MongoDB

4. **Test Offline**:
   - Disconnect internet
   - Add sales
   - Reconnect and check auto-sync

Your retail ERP app is now ready for Android! 🚀
