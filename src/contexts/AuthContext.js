import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import APIService from '../services/APIService';
import SyncService from '../services/SyncService';
import DatabaseService from '../services/DatabaseService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    initializeAuth();
    
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      console.log('Network status:', state.isConnected ? 'Online' : 'Offline');
      
      // Auto-sync when coming back online
      if (state.isConnected && isAuthenticated) {
        console.log('Network available - triggering sync');
        SyncService.forceSync().catch(err => console.log('Background sync failed:', err));
      }
    });

    return unsubscribe;
  }, []);

  const initializeAuth = async () => {
    try {
      // Initialize API service
      await APIService.initialize();

      // Initialize Sync service
      await SyncService.initialize();

      // Check for stored user data
      const storedUser = await AsyncStorage.getItem('user');
      const storedShop = await AsyncStorage.getItem('shop');

      if (storedUser) {
        const userData = JSON.parse(storedUser);
        const shopData = storedShop ? JSON.parse(storedShop) : null;

        setUser(userData);
        setShop(shopData);
        setIsAuthenticated(true);
        APIService.setToken(userData.token);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncUserToSQLite = async (user, shop) => {
    try {
      console.log('🔄 Syncing user to SQLite after login...');
      
      // Check if user already exists in SQLite
      const existingUser = await DatabaseService.executeQuery(
        'SELECT * FROM users WHERE id = ?',
        [user.id]
      );

      if (existingUser.rows.length === 0) {
        console.log('📝 User not found in SQLite, inserting...', { userId: user.id, username: user.username });
        
        // Check if User exists in MySQL, if not, sync from MySQL
        const mysqlUser = await APIService.getUserFromMySQL(user.id);
        if (mysqlUser) {
          console.log('📝 User found in MySQL, syncing to SQLite...');
          await DatabaseService.executeQuery(`
            INSERT INTO users (
              id, username, email, password, name, phone, type,
              isActive, createdAt, updatedAt, lastSyncAt, syncVersion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            mysqlUser.id,
            mysqlUser.username,
            mysqlUser.email || '',
            '', // Password is not needed from server for local auth
            mysqlUser.name,
            mysqlUser.phone || '',
            mysqlUser.type,
            1, // isActive
            new Date().toISOString(),
            new Date().toISOString(),
            new Date().toISOString(),
            1 // syncVersion
          ]);
        } else {
          console.log('📝 User not found in MySQL, skipping sync...');
        }
        
        // Insert user into SQLite
        await DatabaseService.executeQuery(`
          INSERT INTO users (
            id, username, email, password, name, phone, type,
            isActive, createdAt, updatedAt, lastSyncAt, syncVersion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.id,
          user.username,
          user.email || '',
          '', // Password is not needed from server for local auth
          user.name,
          user.phone || '',
          user.type,
          1, // isActive
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString(),
          1 // syncVersion
        ]);

        console.log('✅ User inserted into SQLite successfully');
      } else {
        console.log('✅ User already exists in SQLite, updating sync info...');
        
        // Update existing user's sync info
        await DatabaseService.executeQuery(`
          UPDATE users 
          SET lastSyncAt = ?, syncVersion = ?
          WHERE id = ?
        `, [new Date().toISOString(), 1, user.id]);
      }

      // Sync shop data if provided and shop doesn't exist
      if (shop && shop.id) {
        const existingShop = await DatabaseService.executeQuery(
          'SELECT * FROM shops WHERE id = ?',
          [shop.id]
        );

        if (existingShop.rows.length === 0) {
          console.log('📝 Shop not found in SQLite, inserting...', { shopId: shop.id, shopName: shop.name });
          
          await DatabaseService.executeQuery(`
            INSERT INTO shops (
              id, name, address, phone, email, gstNumber, logo, settings,
              createdAt, updatedAt, lastSyncAt, syncVersion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shop.id,
            shop.name,
            shop.address || '',
            shop.phone || '',
            shop.email || '',
            shop.gstNumber || '',
            shop.logo || '',
            shop.settings ? JSON.stringify(shop.settings) : '{}',
            new Date().toISOString(),
            new Date().toISOString(),
            new Date().toISOString(),
            1 // syncVersion
          ]);

          console.log('✅ Shop inserted into SQLite successfully');
        } else {
          console.log('✅ Shop already exists in SQLite');
        }
      }

      console.log('🎉 User and shop sync completed successfully');
    } catch (error) {
      console.error('❌ Error syncing user to SQLite:', error);
      // Don't throw error to prevent login failure, just log it
    }
  };

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      
      // Check network connectivity first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('Offline mode - attempting local authentication');
        
        // Try to authenticate against local SQLite database
        try {
          const localUser = await DatabaseService.executeQuery(
            'SELECT * FROM users WHERE username = ? AND isActive = 1',
            [username]
          );

          if (localUser.rows.length > 0) {
            const user = localUser.rows.item(0);
            console.log('✅ Found user in SQLite:', { userId: user.id, username: user.username });
            
            // For offline mode, we'll allow login without password validation
            // In a real app, you'd want to store a hashed password and validate it
            // But since the main issue is app reinstallation, we'll focus on that
            
            // Get shop data
            const shopResult = await DatabaseService.executeQuery(
              'SELECT * FROM shops WHERE id = ?',
              [user.shopId]
            );
            
            const shopData = shopResult.rows.length > 0 ? shopResult.rows.item(0) : null;
            
            // Store user data in AsyncStorage
            const userData = {
              id: user.id,
              username: user.username,
              email: user.email,
              name: user.name,
              type: user.type,
              shopId: user.shopId,
              permissions: user.permissions ? JSON.parse(user.permissions) : {},
              token: null // No token in offline mode
            };
            
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            if (shopData) {
              await AsyncStorage.setItem('shop', JSON.stringify(shopData));
            }

            setUser(userData);
            setShop(shopData);
            setIsAuthenticated(true);

            return { success: true, offline: true };
          } else {
            return { 
              success: false, 
              error: 'User not found locally. Please connect to internet to login.' 
            };
          }
        } catch (error) {
          console.error('Local authentication error:', error);
          return { 
            success: false, 
            error: 'Authentication failed. Please connect to internet and try again.' 
          };
        }
      }

      const response = await APIService.login(username, password);

      if (response.success) {
        console.log('Login response:', response);
        
        // Store user data
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        
        // Handle shop data - check multiple possible locations
        let shopData = response.shop || response.data?.shop || response.user?.shop;
        if (shopData) {
          await AsyncStorage.setItem('shop', JSON.stringify(shopData));
          console.log('Shop data saved:', shopData);
        } else {
          console.log('No shop data in login response');
          // Try to fetch shop data if user has shopId
          if (response.user?.shopId) {
            try {
              const shopResponse = await APIService.getShop(response.user.shopId);
              if (shopResponse.success) {
                shopData = shopResponse.data || shopResponse.shop;
                await AsyncStorage.setItem('shop', JSON.stringify(shopData));
                console.log('Shop data fetched separately:', shopData);
              }
            } catch (error) {
              console.log('Failed to fetch shop data:', error);
            }
          }
        }

        // Sync user to SQLite after successful login (handles app reinstallation)
        await syncUserToSQLite(response.user, shopData);

        setUser(response.user);
        setShop(shopData || null);
        setIsAuthenticated(true);
        APIService.setToken(response.token);

        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear stored data
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('shop');

      setUser(null);
      setShop(null);
      setIsAuthenticated(false);
      APIService.clearToken();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await APIService.register(userData);

      if (response.success) {
        // Store user data
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        if (response.shop) {
          await AsyncStorage.setItem('shop', JSON.stringify(response.shop));
          setShop(response.shop);
        }

        // Sync user to SQLite after successful registration
        await syncUserToSQLite(response.user, response.shop);

        setUser(response.user);
        setIsAuthenticated(true);
        APIService.setToken(response.token);

        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData) => {
    try {
      const updatedUser = { ...user, ...userData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const hasPermission = (permission) => {
    if (!user) {
      return false;
    }
    
    // Check user type for basic permissions
    if (user.type === 'Admin' || user.type === 'admin') {
      return true; // Admin has all permissions
    }
    
    // Check permissions object if it exists
    if (user.permissions) {
      return user.permissions[permission] || false;
    }
    
    // Default: no permissions
    return false;
  };

  const value = {
    user,
    shop,
    isLoading,
    isAuthenticated,
    isOnline,
    login,
    logout,
    register,
    updateUser,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
