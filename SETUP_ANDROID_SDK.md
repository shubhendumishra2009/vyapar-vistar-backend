# Android SDK Setup Guide

## 🔍 **Check if SDK is Installed**

### **Method 1: Check ADB Command**
```bash
adb version
```
- If recognized: ✅ SDK installed and in PATH
- If not recognized: ❌ Need to setup SDK

### **Method 2: Check Android Studio**
1. Open Android Studio
2. **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK**
3. Check if SDK path is set

---

## 🔧 **Setup Android SDK**

### **Step 1: Install SDK via Android Studio**
1. **Open Android Studio**
2. **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK**
3. **SDK Manager**:
   - Click **SDK Manager** button
   - Select **Android 13 (API level 33)** or higher
   - Check **Android SDK Platform-Tools**
   - Check **Android SDK Build-Tools**
   - Click **Apply** → **OK**

### **Step 2: Set Environment Variables (Windows)**

#### **Find SDK Path:**
In Android Studio Settings → Android SDK, copy the path like:
```
C:\Users\YourName\AppData\Local\Android\Sdk
```

#### **Add to PATH:**
1. **Windows Key + R** → Type `sysdm.cpl` → **Enter**
2. **Advanced** tab → **Environment Variables**
3. Under **System variables**, find **Path** → **Edit**
4. **New** → Add these paths:
   ```
   C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools
   C:\Users\YourName\AppData\Local\Android\Sdk\tools
   C:\Users\YourName\AppData\Local\Android\Sdk\tools\bin
   ```
5. **OK** → **OK** → **OK**

#### **Restart Command Prompt/VS Code**

### **Step 3: Verify Installation**
```bash
adb version
```
Should show output like:
```
Android Debug Bridge version 1.0.41
Version 33.0.3-8852635
Installed as C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

---

## 📱 **Alternative: Command Line Installation**

### **Using Chocolatey (Windows)**
```bash
# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Android SDK
choco install android-sdk
```

### **Using SDKMAN (Linux/Mac)**
```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install android
```

---

## 🔍 **Troubleshooting**

### **ADB Not Found After Setup:**
1. **Restart VS Code** completely
2. **Restart Command Prompt**
3. **Check PATH** with: `echo %PATH%`
4. **Verify SDK path** is correct

### **Android Studio Issues:**
1. **Update Android Studio** to latest version
2. **Clear cache**: File → Invalidate Caches/Restart
3. **Reinstall SDK** if corrupted

### **Permission Issues:**
1. **Run Android Studio as Administrator**
2. **Check folder permissions** for SDK directory
3. **Add user permissions** to SDK folder

---

## ✅ **Verification Commands**

### **After Setup, Run These:**
```bash
# Check ADB
adb version

# Check SDK Manager
sdkmanager --list

# Check connected devices
adb devices

# Check Java (required for Android)
java -version
```

---

## 🎯 **Next Steps After SDK Setup**

1. **Enable USB Debugging** on your Android device
2. **Connect device** to computer via USB
3. **Verify device connection**: `adb devices`
4. **Install React Native app**: `npx react-native run-android`

---

## 📱 **Quick Test After Setup**

```bash
# Test device connection
adb devices

# Should show output like:
# List of devices attached
# XXXXXXXXXXXXXX    device
```

If you see your device listed, you're ready to install the app! 🚀
