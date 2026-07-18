# Quick Android Installation Guide

## 🚀 **Method A: Direct Development Install**

### **Step 1: Start Metro Bundler**
```bash
cd d:/Projects/VyaparVistar
npx react-native start --port 8082
```

### **Step 2: Install on Android (New Terminal)**
```bash
cd d:/Projects/VyaparVistar
npx react-native run-android --port 8082
```

### **Step 3: App Installs Automatically**
- App will install on connected Android device
- Metro bundler serves the app
- Real-time updates enabled

---

## 📱 **Method B: APK Generation**

### **Step 1: Build APK**
```bash
cd d:/Projects/VyaparVistar/android
./gradlew assembleRelease
```

### **Step 2: Find APK**
Location: `android/app/build/outputs/apk/release/app-release.apk`

### **Step 3: Install APK**
1. Copy APK to phone (USB, WhatsApp, Email)
2. Enable "Install Unknown Sources" in phone settings
3. Tap APK file to install

---

## 🔧 **Network Configuration**

### **For Local Testing:**
Update `src/services/APIService.js`:
```javascript
this.baseURL = 'http://YOUR_COMPUTER_IP:5000/api';
```

### **Find Your Computer IP:**
```bash
ipconfig
```
Look for "IPv4 Address" (usually 192.168.x.x)

---

## 📱 **After Installation**

### **1. Test Backend Connection**
Open browser: http://YOUR_COMPUTER_IP:5000/api/health
Should show: `{"status":"OK","mongodb":"connected"}`

### **2. Test App Login**
- Username: `admin`
- Password: `admin123`

### **3. Test Features**
- Add products/customers
- Create sales
- Test offline sync

---

## 🔍 **Troubleshooting**

### **Metro Port Issues:**
```bash
npx react-native start --port 8082
npx react-native run-android --port 8082
```

### **Device Not Detected:**
```bash
adb kill-server
adb start-server
adb devices
```

### **Build Failed:**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

## 🎯 **Recommended Method**

**Use Method A** for:
- ✅ Fastest installation
- ✅ Live reload
- ✅ Debug capabilities
- ✅ Automatic updates

**Start with Method A for the best experience!** 🚀
