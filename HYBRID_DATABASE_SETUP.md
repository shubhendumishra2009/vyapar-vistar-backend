# Hybrid Database Architecture Setup Guide

## Overview

This guide explains how to implement a hybrid database architecture using MongoDB as the primary backend and SQLite for offline storage with automatic synchronization.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Mobile App    │    │   Mobile App    │
│  (Staff Member) │    │  (Staff Member) │    │  (Shop Owner)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ SQLite (Offline)     │ SQLite (Offline)     │ SQLite (Offline)
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Network Detection     │
                    │   (Online/Offline Sync)   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Backend Server       │
                    │   (Node.js + Express)     │
                    │         MongoDB            │
                    └───────────────────────────┘
```

## Implementation Steps

### 1. Backend Setup (MongoDB + Node.js)

#### 1.1 Install Dependencies
```bash
cd backend
npm install
```

#### 1.2 Environment Setup
Create `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/retail_erp
PORT=5000
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

#### 1.3 Start MongoDB Server
```bash
# For MongoDB Atlas (cloud)
# Update MONGODB_URI in .env to your Atlas connection string

# For Local MongoDB
mongod --dbpath /path/to/your/db
```

#### 1.4 Start Backend Server
```bash
npm run dev
```

### 2. Mobile App Setup

#### 2.1 Install Additional Dependencies
```bash
cd ..
npm install axios socket.io-client @react-native-community/netinfo
```

#### 2.2 Update Database Schema
Add sync fields to existing SQLite tables:
```sql
-- Add to products table
ALTER TABLE products ADD COLUMN lastSyncAt TEXT;
ALTER TABLE products ADD COLUMN syncVersion INTEGER DEFAULT 1;

-- Add to customers table
ALTER TABLE customers ADD COLUMN lastSyncAt TEXT;
ALTER TABLE customers ADD COLUMN syncVersion INTEGER DEFAULT 1;

-- Add to transactions table
ALTER TABLE transactions ADD COLUMN lastSyncAt TEXT;
ALTER TABLE transactions ADD COLUMN syncVersion INTEGER DEFAULT 1;
```

#### 2.3 Update App.js to Initialize Sync Service
```javascript
import SyncService from './src/services/SyncService';

// In App.js, after DatabaseService initialization
useEffect(() => {
  const initializeApp = async () => {
    await DatabaseService.initDatabase();
    await SyncService.initialize();
  };
  
  initializeApp();
}, []);
```

### 3. Network Detection & Auto-Sync

#### 3.1 Sync Service Features
- **Automatic Detection**: Monitors network connectivity
- **Bidirectional Sync**: Uploads local changes, downloads server updates
- **Conflict Resolution**: Handles data conflicts based on timestamps
- **Real-time Updates**: WebSocket integration for live updates
- **Background Sync**: Periodic sync every 5 minutes when online

#### 3.2 Sync Flow
1. **Network Detection**: Automatically detects when device comes online
2. **Upload Changes**: Sends local SQLite changes to MongoDB
3. **Download Updates**: Retrieves server changes and merges locally
4. **Conflict Resolution**: Uses timestamps and version numbers
5. **Real-time Updates**: WebSocket pushes live updates to connected devices

### 4. Multi-User Real-time Features

#### 4.1 WebSocket Integration
```javascript
// In your mobile app
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('product-created', (data) => {
  // Update local SQLite with new product
  SyncService.mergeProduct(data.data, shopId);
});

socket.on('sale-completed', (data) => {
  // Refresh dashboard and sales data
  loadDashboardData();
});
```

#### 4.2 Real-time Updates
- **Product Changes**: When any staff member adds/edits products
- **Sales Updates**: Live sales notifications to shop owner
- **Inventory Alerts**: Real-time low stock notifications
- **Customer Updates**: Credit balance changes across devices

### 5. Authentication & Security

#### 5.1 JWT Token Management
```javascript
// Login response includes JWT token
const loginResponse = {
  user: userData,
  token: jwtToken,
  shop: shopData
};

// Store token for API calls
await AsyncStorage.setItem('authToken', token);
```

#### 5.2 API Security
- JWT-based authentication
- Role-based permissions
- Rate limiting
- Input validation

### 6. Data Synchronization Logic

#### 6.1 Upload Process
1. Identify unsynced records (lastSyncAt is NULL or updatedAt > lastSyncAt)
2. Send batch to server
3. Server processes and updates MongoDB
4. Mark local records as synced
5. Emit real-time updates to other connected devices

#### 6.2 Download Process
1. Request server changes since lastSyncTime
2. Server returns updated/created records
3. Merge with local SQLite
4. Handle conflicts using syncVersion
5. Update lastSyncTime

#### 6.3 Conflict Resolution
- **Last Write Wins**: Based on updatedAt timestamp
- **Version Numbers**: Higher syncVersion wins
- **Manual Resolution**: For critical data conflicts

### 7. Offline Functionality

#### 7.1 Offline Features
- **Complete CRUD Operations**: All features work offline
- **Local Storage**: SQLite stores all data locally
- **Queue Operations**: Changes queued for sync when online
- **Offline Indicators**: UI shows sync status

#### 7.2 Sync Status UI
```javascript
// Add sync status indicator to dashboard
const [syncStatus, setSyncStatus] = useState({});

useEffect(() => {
  SyncService.addListener((event, data) => {
    setSyncStatus(data);
  });
}, []);

// Render sync indicator
<SyncIndicator status={syncStatus} />
```

### 8. Testing & Deployment

#### 8.1 Testing Scenarios
- **Offline to Online**: Test data sync when connectivity restored
- **Concurrent Users**: Test multiple users updating same data
- **Network Interruption**: Test sync during network drops
- **Large Data Sets**: Test performance with thousands of records

#### 8.2 Production Setup
```env
# Production .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/retail_erp
PORT=5000
JWT_SECRET=production_jwt_secret
NODE_ENV=production
```

### 9. Monitoring & Maintenance

#### 9.1 Sync Monitoring
- Track sync success/failure rates
- Monitor conflict occurrences
- Log sync performance metrics
- Alert on sync failures

#### 9.2 Database Maintenance
- Regular MongoDB backups
- SQLite cleanup for deleted records
- Index optimization for performance
- Data integrity checks

## Benefits of This Architecture

### For Shop Owner
- **Real-time Visibility**: See all transactions as they happen
- **Multi-device Access**: Use phone, tablet, or computer
- **Data Security**: Cloud backup with offline reliability
- **Staff Management**: Monitor all staff activities in real-time

### For Staff Members
- **Offline Reliability**: Work even without internet
- **Automatic Sync**: No manual data transfer needed
- **Real-time Updates**: Get latest product/pricing info
- **Consistent Data**: Same data across all devices

### Technical Benefits
- **Scalability**: MongoDB handles large datasets
- **Performance**: SQLite provides fast local access
- **Reliability**: Works offline, syncs when online
- **Real-time**: WebSocket enables live updates

## Troubleshooting

### Common Issues

1. **Sync Failures**
   - Check network connectivity
   - Verify JWT token validity
   - Check server logs for errors

2. **Data Conflicts**
   - Review syncVersion numbers
   - Check updatedAt timestamps
   - Manual conflict resolution if needed

3. **Performance Issues**
   - Optimize database indexes
   - Reduce batch sizes for large datasets
   - Implement pagination for large queries

4. **Authentication Issues**
   - Verify JWT secret matches between client/server
   - Check token expiration
   - Refresh token if expired

## Next Steps

1. **Set up MongoDB Atlas** for cloud database
2. **Deploy backend server** to hosting service
3. **Update mobile app** with server URL
4. **Test sync functionality** thoroughly
5. **Train staff** on new features
6. **Monitor system** in production

This hybrid architecture provides the best of both worlds: offline reliability with cloud synchronization and real-time multi-user collaboration.
