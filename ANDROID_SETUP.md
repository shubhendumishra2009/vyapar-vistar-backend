# Android Mobile App Setup & Testing

## 📱 **Setup Complete!**

Your hybrid database architecture is now ready:

- ✅ **Backend Server**: Running on http://localhost:5000
- ✅ **MongoDB**: Connected to Atlas cluster
- ✅ **Mobile Dependencies**: Installed and configured
- ✅ **API Service**: Created for backend communication

## 🚀 **Test Your Mobile App**

### **Step 1: Start Metro Bundler**
```bash
cd d:/Projects/VyaparVistar
npm start
```

### **Step 2: Run on Android Device/Emulator**
```bash
# Option A: With Android Studio
npm run android

# Option B: With CLI
npx react-native run-android
```

### **Step 3: Test Backend Connection**

Once the app loads, it should:
1. **Auto-connect** to your backend server
2. **Sync data** between SQLite and MongoDB
3. **Show real-time updates** when data changes

## 🔧 **Configuration Files Updated**

### **API Service** (`src/services/APIService.js`)
- Server URL: `http://localhost:5000/api`
- All CRUD endpoints configured
- JWT authentication handled

### **Auth Context** (`src/contexts/AuthContext.js`)
- Uses API service instead of direct database
- Maintains session with backend
- Handles login/logout properly

## 📊 **Test Scenarios**

### **1. Login Test**
- Open mobile app
- Try login with: `admin` / `admin123`
- Should authenticate with backend

### **2. Data Sync Test**
- Add a product in mobile app
- Check if it appears in MongoDB
- Should sync automatically when online

### **3. Offline Test**
- Disconnect internet
- Add customer/sale in app
- Should store in SQLite
- Reconnect internet - should auto-sync

### **4. Real-time Test**
- Open app on two devices
- Add product on device 1
- Should appear on device 2 automatically

## 🌐 **Network Configuration**

### **For Local Testing**
- Backend: `http://localhost:5000`
- Mobile: Same WiFi network as computer

### **For Production**
- Update `APIService.js` server URL:
  ```javascript
  this.baseURL = 'https://your-production-server.com/api';
  ```

## 🔍 **Debugging Tips**

### **Check Network Connection**
1. **Backend Health**: http://localhost:5000/api/health
2. **Mobile Logs**: Check console for API calls
3. **MongoDB**: Verify Atlas connection is stable

### **Common Issues**
1. **CORS Error**: Backend allows mobile origin
2. **Network Timeout**: Check WiFi connection
3. **Auth Failed**: Verify JWT token handling

## 📱 **Android Specific Setup**

### **Permissions Required**
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### **Network Security Config**
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<application
  android:usesCleartextTraffic="true"
  android:networkSecurityConfig="@xml/network_security_config">
```

Create `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

## 🎯 **Next Steps**

1. **Start Metro**: `npm start`
2. **Run Android**: `npm run android`
3. **Test Login**: Use admin credentials
4. **Test Sync**: Add products/customers
5. **Test Offline**: Disconnect network and test
6. **Deploy**: Update server URL for production

Your retail ERP app with hybrid MongoDB + SQLite architecture is ready for Android testing! 🚀
