import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../contexts/AuthContext';
import {useDatabase} from '../contexts/DatabaseContext';
import APIService from '../services/APIService';

const {width} = Dimensions.get('window');

const DashboardScreen = ({navigation}) => {
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentShop, setCurrentShop] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Shop creation form state
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('retail');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopGst, setShopGst] = useState('');
  const [creatingShop, setCreatingShop] = useState(false);
  
  const {user, isOnline} = useAuth();
  const {executeQuery} = useDatabase();

  const shopTypes = [
    { label: 'Retail', value: 'retail' },
    { label: 'Wholesale', value: 'wholesale' },
    { label: 'Medicine', value: 'medicine' },
    { label: 'Hardware', value: 'hardware' },
    { label: 'Grocery', value: 'grocery' },
    { label: 'Restaurant', value: 'restaurant' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Clothing', value: 'clothing' },
    { label: 'General', value: 'general' },
    { label: 'Other', value: 'other' }
  ];

  useEffect(() => {
    loadUserShops();
  }, []);

  const loadUserShops = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading user shops...');
      console.log('📶 Network status:', isOnline ? 'Online' : 'Offline');
      console.log('👤 User ID:', user.id);
      
      // Wait a moment for database to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isOnline) {
        console.log('📱 Loading shops from SQLite (offline mode)');
        
        // Load from SQLite when offline using DatabaseService
        try {
          const DatabaseService = require('../services/DatabaseService').default;
          
          const result = await DatabaseService.executeQuery(`
            SELECT s.*, us.role, us.isActive, us.joinedAt, us.permissions
            FROM user_shops us
            JOIN shops s ON us.shopId = s.id
            WHERE us.userId = ? AND us.isActive = 1
            ORDER BY us.createdAt DESC
          `, [user.id]);
          
          console.log('📊 SQLite query result:', result);
          
          const userShops = result && result.rows ? result.rows.raw().map(row => ({
            ...row,
            permissions: row.permissions ? JSON.parse(row.permissions) : {}
          })) : result && Array.isArray(result) ? result.map(row => ({
            ...row,
            permissions: row.permissions ? JSON.parse(row.permissions) : {}
          })) : [];
          
          console.log('🏪 Processed user shops from SQLite:', userShops);
          setShops(userShops);
        } catch (sqliteError) {
          console.error('❌ SQLite query failed:', sqliteError);
          Alert.alert('Error', 'Failed to load shops from local database');
        }
      } else {
        console.log('🌐 Loading shops from API (online mode)');
        
        // Load from API when online
        const response = await APIService.getUserShops();
        console.log('📥 API response:', response);
        
        if (response && Array.isArray(response)) {
          console.log('✅ API shops loaded:', response);
          
          // Try to sync to SQLite, but don't fail if database isn't ready
          try {
            const localShops = await executeQuery(`
              SELECT s.*, us.role, us.isActive, us.joinedAt, us.permissions
              FROM user_shops us
              JOIN shops s ON us.shopId = s.id
              WHERE us.userId = ? AND us.isActive = 1
              ORDER BY us.createdAt DESC
            `, [user.id]);
            
            const localShopIds = localShops && localShops.rows ? localShops.rows.raw().map(shop => shop.id) : [];
            const remoteShopIds = response.map(shop => shop.id);
            
            // Find shops that are in MySQL but not in SQLite
            const missingShops = response.filter(shop => !localShopIds.includes(shop.id));
            
            if (missingShops.length > 0) {
              console.log('🔄 Syncing missing shops from MySQL to SQLite:', missingShops.map(s => s.id));
              
              for (const shopData of missingShops) {
                try {
                  // Insert shop into SQLite
                  await executeQuery(`
                    INSERT OR REPLACE INTO shops (
                      id, name, type, address, phone, email, gstNumber, 
                      logo, settings, isActive, subscription, 
                      createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    shopData.id,
                    shopData.name,
                    shopData.type,
                    shopData.address || '',
                    shopData.phone || '',
                    shopData.email || '',
                    shopData.gstNumber || '',
                    shopData.logo || '',
                    JSON.stringify(shopData.settings || {}),
                    shopData.isActive ? 1 : 0,
                    JSON.stringify(shopData.subscription || {}),
                    shopData.createdAt,
                    shopData.updatedAt
                  ]);
                  
                  // Insert user-shop association
                  await executeQuery(`
                    INSERT OR REPLACE INTO user_shops (
                      userId, shopId, role, isActive, joinedAt, 
                      permissions, createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    user.id,
                    shopData.id,
                    shopData.role,
                    shopData.isActive ? 1 : 0,
                    shopData.joinedAt,
                    JSON.stringify(shopData.permissions || {
                      canManageProducts: true,
                      canManageCustomers: true,
                      canManageTransactions: true,
                      canManageReports: true,
                      canManageSettings: true,
                      canManageUsers: true
                    }),
                    shopData.joinedAt,
                    shopData.joinedAt
                  ]);
                  
                  console.log('✅ Shop synced to SQLite:', shopData.id);
                } catch (syncError) {
                  console.error('❌ Failed to sync shop to SQLite:', syncError);
                }
              }
            }
          } catch (syncError) {
            console.warn('⚠️ SQLite sync skipped (database not ready):', syncError.message);
            
            // Retry SQLite sync after a delay
            setTimeout(async () => {
              try {
                console.log('🔄 Retrying SQLite sync...');
                await syncShopToSQLite(response);
                console.log('✅ SQLite sync completed on retry');
              } catch (retryError) {
                console.error('❌ SQLite sync retry failed:', retryError);
              }
            }, 2000); // Retry after 2 seconds
          }
          
          setShops(response);
        } else {
          console.error('❌ API failed, trying fallback to SQLite');
          
          // Fallback to SQLite if API fails
          try {
            const result = await executeQuery(`
              SELECT s.*, us.role, us.isActive, us.joinedAt, us.permissions
              FROM user_shops us
              JOIN shops s ON us.shopId = s.id
              WHERE us.userId = ? AND us.isActive = 1
              ORDER BY us.createdAt DESC
            `, [user.id]);
            
            const userShops = result.rows.raw().map(row => ({
              ...row,
              permissions: row.permissions ? JSON.parse(row.permissions) : {}
            }));
            
            console.log('🔄 Fallback shops from SQLite:', userShops);
            setShops(userShops);
          } catch (fallbackError) {
            console.error('❌ SQLite fallback also failed:', fallbackError);
            Alert.alert('Error', 'Failed to load shops. Please check your internet connection.');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading user shops:', error);
      Alert.alert('Error', 'Failed to load shops');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const createShop = async () => {
    try {
      if (!shopName.trim() || !shopType) {
        Alert.alert('Error', 'Shop name and type are required');
        return;
      }

      setCreatingShop(true);
      
      const shopData = {
        name: shopName.trim(),
        type: shopType,
        address: shopAddress.trim(),
        phone: shopPhone.trim(),
        email: shopEmail.trim(),
        gstNumber: shopGst.trim(),
        settings: {
          currency: 'INR',
          taxEnabled: true,
          taxRate: 18,
          invoicePrefix: 'INV',
          lowStockAlert: true,
          minStockLevel: 10
        }
      };

      console.log('🔄 Creating shop with data:', JSON.stringify(shopData, null, 2));
      
      const response = await APIService.createShop(shopData);
      
      console.log('📥 Create shop response:', response);
      
      if (response && response.success) {
        // Sync to SQLite
        try {
          const shopData = response.data;
          console.log('🔄 Syncing shop to SQLite:', shopData.id);
          
          // Insert shop into SQLite
          await executeQuery(`
            INSERT OR REPLACE INTO shops (
              id, name, type, address, phone, email, gstNumber, 
              logo, settings, isActive, subscription, 
              createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shopData.id,
            shopData.name,
            shopData.type,
            shopData.address || '',
            shopData.phone || '',
            shopData.email || '',
            shopData.gstNumber || '',
            shopData.logo || '',
            JSON.stringify(shopData.settings || {}),
            shopData.isActive ? 1 : 0,
            JSON.stringify(shopData.subscription || {}),
            shopData.createdAt,
            shopData.updatedAt
          ]);
          
          // Insert user-shop association
          await executeQuery(`
            INSERT OR REPLACE INTO user_shops (
              userId, shopId, role, isActive, joinedAt, 
              permissions, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.id,
            shopData.id,
            shopData.role,
            shopData.isActive ? 1 : 0,
            shopData.joinedAt,
            JSON.stringify({
              canManageProducts: true,
              canManageCustomers: true,
              canManageTransactions: true,
              canManageReports: true,
              canManageSettings: true,
              canManageUsers: true
            }),
            shopData.joinedAt,
            shopData.joinedAt
          ]);
          
          console.log('✅ Shop synced to SQLite successfully');
        } catch (syncError) {
          console.error('❌ Failed to sync shop to SQLite:', syncError);
        }
        
        Alert.alert('Success', 'Shop created successfully');
        setShowCreateModal(false);
        resetShopForm();
        await loadUserShops(); // Refresh shops list
      } else {
        console.error('❌ Create shop failed:', response?.error);
        Alert.alert('Error', response?.error || 'Failed to create shop');
      }
    } catch (error) {
      console.error('Create shop error:', error);
      Alert.alert('Error', 'Failed to create shop');
    } finally {
      setCreatingShop(false);
    }
  };

  const resetShopForm = () => {
    setShopName('');
    setShopType('retail');
    setShopAddress('');
    setShopPhone('');
    setShopEmail('');
    setShopGst('');
  };

  // Separate function to sync shops to SQLite (for retry mechanism)
  const syncShopToSQLite = async (shops) => {
    if (!shops || !Array.isArray(shops) || shops.length === 0) {
      console.log('ℹ️ No shops to sync');
      return;
    }

    console.log('🔄 Syncing shops to SQLite...');
    
    // Import DatabaseService dynamically to avoid circular dependencies
    const DatabaseService = require('../services/DatabaseService').default;
    
    try {
      // Get existing local shops using DatabaseService (like login process)
      const localShops = await DatabaseService.executeQuery(`
        SELECT s.*, us.role, us.isActive, us.joinedAt, us.permissions
        FROM user_shops us
        JOIN shops s ON us.shopId = s.id
        WHERE us.userId = ? AND us.isActive = 1
        ORDER BY us.createdAt DESC
      `, [user.id]);
    
    const localShopIds = localShops && localShops.rows ? localShops.rows.raw().map(shop => shop.id) : 
                     localShops && Array.isArray(localShops) ? localShops.map(shop => shop.id) : [];
    const remoteShopIds = shops.map(shop => shop.id);
    
    // Find shops that are in MySQL but not in SQLite
    const missingShops = shops.filter(shop => !localShopIds.includes(shop.id));
    
    if (missingShops.length > 0) {
      console.log('🔄 Syncing missing shops to SQLite:', missingShops.map(s => s.name));
      
      for (const shopData of missingShops) {
        try {
          // Insert shop into SQLite using DatabaseService
          await DatabaseService.executeQuery(`
            INSERT OR REPLACE INTO shops (
              id, name, type, address, phone, email, gstNumber, 
              logo, settings, createdAt, updatedAt, lastSyncAt, syncVersion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shopData.id,
            shopData.name,
            shopData.type,
            shopData.address || '',
            shopData.phone || '',
            shopData.email || '',
            shopData.gstNumber || '',
            shopData.logo || '',
            JSON.stringify(shopData.settings || {}),
            shopData.createdAt,
            shopData.updatedAt,
            new Date().toISOString(),
            1
          ]);
          
          // Insert user-shop association using DatabaseService
          await DatabaseService.executeQuery(`
            INSERT OR REPLACE INTO user_shops (
              userId, shopId, role, isActive, joinedAt, 
              permissions, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.id,
            shopData.id,
            shopData.role,
            shopData.isActive ? 1 : 0,
            shopData.joinedAt,
            JSON.stringify(shopData.permissions || {
              canManageProducts: true,
              canManageCustomers: true,
              canManageTransactions: true,
              canManageReports: true,
              canManageSettings: true,
              canManageUsers: true
            }),
            shopData.joinedAt,
            shopData.joinedAt
          ]);
          
          console.log('✅ Shop synced to SQLite:', shopData.name);
        } catch (syncError) {
          console.error('❌ Failed to sync shop to SQLite:', syncError);
        }
      }
    } else {
      console.log('✅ All shops already synced to SQLite');
    }
    } catch (error) {
      console.error('❌ SQLite sync failed:', error);
      throw error;
    }
  };

  // Debug function to check SQLite database
  const checkSQLiteDatabase = async () => {
    try {
      console.log('🔍 Checking SQLite database contents...');
      
      // Check shops table
      const shopsResult = await executeQuery('SELECT * FROM shops');
      console.log('📊 SQLite shops count:', shopsResult.rows.length);
      console.log('📊 SQLite shops:', shopsResult.rows);
      
      // Check user_shops table
      const userShopsResult = await executeQuery('SELECT * FROM user_shops');
      console.log('👥 SQLite user_shops count:', userShopsResult.rows.length);
      console.log('👥 SQLite user_shops:', userShopsResult.rows);
      
      // Check current user's shops
      const currentUserShops = await executeQuery(`
        SELECT s.*, us.role, us.isActive, us.joinedAt, us.permissions
        FROM user_shops us
        JOIN shops s ON us.shopId = s.id
        WHERE us.userId = ? AND us.isActive = 1
        ORDER BY us.createdAt DESC
      `, [user.id]);
      
      console.log('🏪 Current user shops from SQLite count:', currentUserShops.rows.length);
      console.log('🏪 Current user shops from SQLite:', currentUserShops.rows);
      
      // Also check the raw user_shops for current user
      const rawUserShops = await executeQuery(`
        SELECT * FROM user_shops WHERE userId = ?
      `, [user.id]);
      
      console.log('🔍 Raw user_shops for current user:', rawUserShops.rows);
      
      // Show current state
      console.log('📱 Current dashboard shops state:', shops);
      console.log('👤 Current user:', user);
      
      // Check if we need to sync from MySQL
      if (isOnline) {
        console.log('🔄 Checking for shops to sync from MySQL...');
        
        try {
          const response = await APIService.getUserShops();
          if (response.success) {
            const localShopIds = currentUserShops.rows.raw().map(shop => shop.id);
            const remoteShopIds = response.data.map(shop => shop.id);
            
            const missingShops = response.data.filter(shop => !localShopIds.includes(shop.id));
            
            if (missingShops.length > 0) {
              console.log('🔄 Found shops to sync from MySQL:', missingShops.map(s => s.name));
              
              // Auto-sync missing shops
              for (const shopData of missingShops) {
                try {
                  await executeQuery(`
                    INSERT OR REPLACE INTO shops (
                      id, name, type, address, phone, email, gstNumber, 
                      logo, settings, isActive, subscription, 
                      createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    shopData.id,
                    shopData.name,
                    shopData.type,
                    shopData.address || '',
                    shopData.phone || '',
                    shopData.email || '',
                    shopData.gstNumber || '',
                    shopData.logo || '',
                    JSON.stringify(shopData.settings || {}),
                    shopData.isActive ? 1 : 0,
                    JSON.stringify(shopData.subscription || {}),
                    shopData.createdAt,
                    shopData.updatedAt
                  ]);
                  
                  await executeQuery(`
                    INSERT OR REPLACE INTO user_shops (
                      userId, shopId, role, isActive, joinedAt, 
                      permissions, createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    user.id,
                    shopData.id,
                    shopData.role,
                    shopData.isActive ? 1 : 0,
                    shopData.joinedAt,
                    JSON.stringify(shopData.permissions || {
                      canManageProducts: true,
                      canManageCustomers: true,
                      canManageTransactions: true,
                      canManageReports: true,
                      canManageSettings: true,
                      canManageUsers: true
                    }),
                    shopData.joinedAt,
                    shopData.joinedAt
                  ]);
                  
                  console.log('✅ Shop synced to SQLite:', shopData.name);
                } catch (syncError) {
                  console.error('❌ Failed to sync shop to SQLite:', syncError);
                }
              }
            }
          } catch (syncError) {
            console.warn('⚠️ SQLite sync skipped (database not ready):', syncError.message);
            
            // Retry SQLite sync after a delay
            setTimeout(async () => {
              try {
                console.log('🔄 Retrying SQLite sync...');
                await syncShopToSQLite(response);
                console.log('✅ SQLite sync completed on retry');
              } catch (retryError) {
                console.error('❌ SQLite sync retry failed:', retryError);
              }
            }, 2000); // Retry after 2 seconds
          }
          
          setShops(response);
        } else {
          console.error('❌ API failed, trying fallback to SQLite');
          
          // Fallback to SQLite if API fails
          try {
            const result = await executeQuery(`
              SELECT s.*, us.role, us.isActive, us.joinedAt, us.permissions
              FROM user_shops us
              JOIN shops s ON us.shopId = s.id
              WHERE us.userId = ? AND us.isActive = 1
              ORDER BY us.createdAt DESC
            `, [user.id]);
            
            const userShops = result.rows.raw().map(row => ({
              ...row,
              permissions: row.permissions ? JSON.parse(row.permissions) : {}
            }));
            
            console.log('🔄 Fallback shops from SQLite:', userShops);
            setShops(userShops);
          } catch (fallbackError) {
            console.error('❌ SQLite fallback also failed:', fallbackError);
            Alert.alert('Error', 'Failed to load shops. Please check your internet connection.');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading user shops:', error);
      Alert.alert('Error', 'Failed to load shops');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading shops...</Text>
        </View>
      );
    }

    if (shops.length === 0) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>My Shops</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Icon name="plus" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create First Shop</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emptyState}>
            <Icon name="store" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              You haven't created any shops yet
            </Text>
            <Text style={styles.emptySubText}>
              Create your first shop to start managing your business
            </Text>
          </View>

          {/* Create Shop Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showCreateModal}
            onRequestClose={() => setShowCreateModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Shop</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Icon name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Shop Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter shop name"
                      value={shopName}
                      onChangeText={setShopName}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Shop Type *</Text>
                    <View style={styles.typeGrid}>
                      {['retail', 'wholesale', 'medicine', 'hardware', 'grocery'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeButton,
                            shopType === type && styles.selectedType
                          ]}
                          onPress={() => setShopType(type)}
                        >
                          <Text style={[
                            styles.typeText,
                            shopType === type && styles.selectedTypeText
                          ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.typeGrid}>
                      {['restaurant', 'electronics', 'clothing', 'general', 'other'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeButton,
                            shopType === type && styles.selectedType
                          ]}
                          onPress={() => setShopType(type)}
                        >
                          <Text style={[
                            styles.typeText,
                            shopType === type && styles.selectedTypeText
                          ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Address</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Enter shop address"
                      value={shopAddress}
                      onChangeText={setShopAddress}
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, {flex: 1, marginRight: 8}]}>
                      <Text style={styles.label}>Phone</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Phone number"
                        value={shopPhone}
                        onChangeText={setShopPhone}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Email address"
                        value={shopEmail}
                        onChangeText={setShopEmail}
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>GST Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter GST number"
                      value={shopGst}
                      onChangeText={setShopGst}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, creatingShop && styles.disabledButton]}
                  onPress={createShop}
                  disabled={creatingShop}
                >
                  {creatingShop ? (
                    <Text style={styles.modalButtonText}>Creating...</Text>
                  ) : (
                    <Text style={styles.modalButtonText}>Create Shop</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shop Selection</Text>
        </View>

        <View style={styles.content}>
          {shops.length > 0 ? (
            <View style={styles.shopSelection}>
              <Text style={styles.label}>Select Shop</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowDropdown(!showDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {currentShop ? currentShop.name : 'Select a shop'}
                  </Text>
                  <Icon name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                </TouchableOpacity>
                
                {showDropdown && (
                  <View style={styles.dropdownList}>
                    {shops.map((shop) => (
                      <TouchableOpacity
                        key={shop.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          selectShop(shop);
                          setShowDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{shop.name}</Text>
                        <Text style={styles.dropdownItemSubtext}>
                          {shopTypes.find(t => t.value === shop.type)?.label || shop.type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              {currentShop && (
                <View style={styles.selectedShopInfo}>
                  <Text style={styles.selectedShopName}>{currentShop.name}</Text>
                  <Text style={styles.selectedShopDetails}>
                    {currentShop.address} • {currentShop.phone}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.lockButton, !currentShop && styles.disabledButton]}
                onPress={lockShop}
                disabled={!currentShop}
              >
                <Icon name={isLocked ? "lock" : "lock-open"} size={20} color="#fff" />
                <Text style={styles.lockButtonText}>
                  {isLocked ? 'Shop Locked' : 'Lock Shop'}
                </Text>
              </TouchableOpacity>
              
              {isLocked && (
                <TouchableOpacity
                  style={styles.proceedButton}
                  onPress={() => navigation.navigate('MainTabs')}
                >
                  <Icon name="arrow-right" size={20} color="#fff" />
                  <Text style={styles.proceedButtonText}>Proceed to Features</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noShops}>
              <Icon name="store" size={60} color="#ccc" />
              <Text style={styles.noShopsText}>No shops found</Text>
              <Text style={styles.noShopsSubtext}>Create your first shop to get started</Text>
              <TouchableOpacity
                style={styles.createShopButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.createShopButtonText}>Create Shop</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Create Shop Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCreateModal}
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Shop</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Shop Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter shop name"
                    value={shopName}
                    onChangeText={setShopName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Shop Type *</Text>
                  <View style={styles.typeGrid}>
                    {['retail', 'wholesale', 'medicine', 'hardware', 'grocery'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          shopType === type && styles.selectedType
                        ]}
                        onPress={() => setShopType(type)}
                      >
                        <Text style={[
                          styles.typeText,
                          shopType === type && styles.selectedTypeText
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.typeGrid}>
                    {['restaurant', 'electronics', 'clothing', 'general', 'other'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          shopType === type && styles.selectedType
                        ]}
                        onPress={() => setShopType(type)}
                      >
                        <Text style={[
                          styles.typeText,
                          shopType === type && styles.selectedTypeText
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter shop address"
                    value={shopAddress}
                    onChangeText={setShopAddress}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, {flex: 1, marginRight: 8}]}>
                    <Text style={styles.label}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone number"
                      value={shopPhone}
                      onChangeText={setShopPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      value={shopEmail}
                      onChangeText={setShopEmail}
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>GST Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter GST number"
                    value={shopGst}
                    onChangeText={setShopGst}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, creatingShop && styles.disabledButton]}
                onPress={createShop}
                disabled={creatingShop}
              >
                {creatingShop ? (
                  <Text style={styles.modalButtonText}>Creating...</Text>
                ) : (
                  <Text style={styles.modalButtonText}>Create Shop</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );  });
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Shops</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.createButton, styles.debugButton]}
              onPress={checkSQLiteDatabase}
            >
              <Icon name="database-search" size={16} color="#fff" />
              <Text style={styles.createButtonText}>Debug</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Icon name="plus" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create New Shop</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.shopList}>
          {shops.map((shop) => (
            <View key={shop.id} style={styles.shopCard}>
              <View style={styles.shopHeader}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopType}>{shopTypes.find(t => t.value === shop.type)?.label || shop.type}</Text>
                <View style={styles.shopStatus}>
                  <Text style={[styles.statusText, shop.isActive && styles.activeStatus]}>
                    {shop.isActive ? 'Active' : 'Inactive'}
                  </Text>
                  {currentShop?.id === shop.id && (
                    <Text style={[styles.statusText, isLocked && styles.lockedStatus]}>
                      {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.shopActions}>
                <TouchableOpacity
                  style={[styles.actionButton, currentShop?.id === shop.id && styles.selectedButton]}
                  onPress={() => selectShop(shop)}
                >
                  <Text style={styles.actionButtonText}>
                    {currentShop?.id === shop.id ? 'Selected' : 'Select'}
                  </Text>
                </TouchableOpacity>

                {currentShop?.id === shop.id && (
                  <TouchableOpacity
                    style={[styles.lockButton, isLocked ? styles.unlockButton : styles.lockButton]}
                    onPress={isLocked ? unlockShop : lockShop}
                  >
                    <Icon 
                      name={isLocked ? "lock-open" : "lock"} 
                      size={16} 
                      color="#fff" 
                    />
                    <Text style={styles.lockButtonText}>
                      {isLocked ? 'Unlock' : 'Lock'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.proceedButton}
                  onPress={proceedToFeatures}
                  disabled={!currentShop || !isLocked}
                >
                  <Text style={styles.proceedButtonText}>Proceed to Features</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Create Shop Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCreateModal}
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Shop</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Shop Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter shop name"
                  value={shopName}
                  onChangeText={setShopName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Shop Type *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {shopTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        shopType === type.value && styles.selectedType
                      ]}
                      onPress={() => setShopType(type.value)}
                    >
                      <Text style={[
                        styles.typeText,
                        shopType === type.value && styles.selectedTypeText
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={shopPhone}
                  onChangeText={setShopPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={shopEmail}
                  onChangeText={setShopEmail}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>GST Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter GST number"
                  value={shopGst}
                  onChangeText={setShopGst}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, creatingShop && styles.disabledButton]}
                onPress={createShop}
                disabled={creatingShop}
              >
                {creatingShop ? (
                  <Text style={styles.modalButtonText}>Creating...</Text>
                ) : (
                  <Text style={styles.modalButtonText}>Create Shop</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Refresh Control */}
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      </View>
    );
  };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  debugButton: {
    backgroundColor: '#FF9800',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  shopList: {
    flex: 1,
    padding: 10,
  },
  shopCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  shopType: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  shopStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatus: {
    color: '#4CAF50',
  },
  lockedStatus: {
    color: '#FF9800',
  },
  shopActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  selectedButton: {
    backgroundColor: '#2196F3',
  },
  lockButton: {
    backgroundColor: '#FF9800',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  unlockButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  lockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  proceedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    paddingBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  typeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  selectedType: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  selectedTypeText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

  return renderContent();

  const handleManualSync = async () => {
    if (syncing) return;
    
    try {
      setSyncing(true);
      console.log('Starting manual sync with server...');
      
      const success = await SyncService.forceSync();
      if (success) {
        console.log('Sync completed successfully');
        // Reload dashboard data after sync
        await loadDashboardData();
      } else {
        console.log('Sync failed - offline or server unavailable');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  
  const TransactionItem = ({transaction}) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionCustomer}>{transaction.customerName || 'Walk-in Customer'}</Text>
        <Text style={styles.transactionDate}>
          {new Date(transaction.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={styles.transactionAmount}>
          ₹{transaction.total.toFixed(2)}
        </Text>
        <Text style={[
          styles.transactionStatus,
          {color: transaction.paymentStatus === 'paid' ? '#4CAF50' : '#FF9800'}
        ]}>
          {transaction.paymentStatus}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Offline Mode Indicator */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Icon name="wifi-off" size={20} color="#FF9800" />
          <Text style={styles.offlineText}>Offline Mode - Limited Functionality</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.shopName}>{shop?.name}</Text>
            <Text style={styles.networkStatus}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </Text>
          </View>
          {/* Only show sync button when online */}
          {isOnline && (
            <TouchableOpacity 
              style={[styles.syncButton, syncing && styles.syncButtonActive]} 
              onPress={handleManualSync}
              disabled={syncing}
            >
              <Icon 
                name={syncing ? "sync" : "cloud-sync"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.syncButtonText}>
                {syncing ? "Syncing..." : "Sync"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Today's Sales"
          value={stats.todaySales}
          icon="cash-multiple"
          color="#4CAF50"
          onPress={() => navigation.navigate('Sales')}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalSales.toFixed(0)}`}
          icon="currency-usd"
          color="#2196F3"
          onPress={() => navigation.navigate('Reports')}
        />
        <StatCard
          title="Customers"
          value={stats.totalCustomers}
          icon="account-group-outline"
          color="#FF9800"
          onPress={() => navigation.navigate('Customers')}
        />
        <StatCard
          title="Products"
          value={stats.totalProducts}
          icon="package-variant"
          color="#9C27B0"
          onPress={() => navigation.navigate('Products')}
        />
      </View>

      {stats.lowStockItems > 0 && (
        <View style={styles.alertCard}>
          <Icon name="alert-circle" size={24} color="#F44336" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Low Stock Alert</Text>
            <Text style={styles.alertMessage}>
              {stats.lowStockItems} items need restocking
            </Text>
          </View>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Text style={styles.alertButtonText}>View Inventory</Text>
          </TouchableOpacity>
        </View>
      )}

      {stats.pendingPayments > 0 && (
        <View style={styles.alertCard}>
          <Icon name="clock-time-eight-outline" size={24} color="#FF9800" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Pending Payments</Text>
            <Text style={styles.alertMessage}>
              ₹{stats.pendingPayments.toFixed(2)} outstanding
            </Text>
          </View>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => navigation.navigate('SMS')}>
            <Text style={styles.alertButtonText}>Send SMS</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction, index) => (
            <TransactionItem key={index} transaction={transaction} />
          ))
        ) : (
          <Text style={styles.emptyText}>No transactions yet</Text>
        )}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#4CAF50'}]}
            onPress={() => navigation.navigate('NewSale')}>
            <Icon name="plus" size={20} color="white" />
            <Text style={styles.actionButtonText}>New Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#2196F3'}]}
            onPress={() => navigation.navigate('AddProduct')}>
            <Icon name="plus" size={20} color="white" />
            <Text style={styles.actionButtonText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, {backgroundColor: '#FF9800'}]}
            onPress={() => navigation.navigate('AddCustomer')}>
            <Icon name="plus" size={20} color="white" />
            <Text style={styles.actionButtonText}>Add Customer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  shopName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  syncButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  syncButtonActive: {
    backgroundColor: '#1976D2',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 40) / 2,
    backgroundColor: 'white',
    padding: 20,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  alertContent: {
    flex: 1,
    marginLeft: 15,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  alertButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  alertButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionCustomer: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  quickActions: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  offlineBanner: {
    backgroundColor: '#FF9800',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  offlineText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  networkStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default DashboardScreen;
