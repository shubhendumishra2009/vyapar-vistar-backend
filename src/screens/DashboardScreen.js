import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../contexts/AuthContext';
import {useDatabase} from '../contexts/DatabaseContext';
import APIService from '../services/APIService';

const {width} = Dimensions.get('window');

const DashboardScreen = ({navigation}) => {
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentShop, setCurrentShop] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
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
      
      if (isOnline) {
        console.log('🌐 Loading shops from API (online mode)');
        
        const response = await APIService.getUserShops();
        console.log('📥 API response:', response);
        
        if (response && Array.isArray(response)) {
          console.log('✅ API shops loaded:', response);
          setShops(response);
        } else {
          console.error('❌ API failed, trying fallback to SQLite');
          
          try {
            const DatabaseService = require('../services/DatabaseService').default;
            const result = await DatabaseService.executeQuery(`
              SELECT s.*, us.role, us.isActive, us.joinedAt, us.permissions
              FROM user_shops us
              JOIN shops s ON us.shopId = s.id
              WHERE us.userId = ? AND us.isActive = 1
              ORDER BY us.createdAt DESC
            `, [user.id]);
            
            const userShops = result && result.rows ? result.rows.raw().map(row => ({
              ...row,
              permissions: row.permissions ? JSON.parse(row.permissions) : {}
            })) : result && Array.isArray(result) ? result.map(row => ({
              ...row,
              permissions: row.permissions ? JSON.parse(row.permissions) : {}
            })) : [];
            
            console.log('🔄 Fallback shops from SQLite:', userShops);
            setShops(userShops);
          } catch (fallbackError) {
            console.error('❌ SQLite fallback also failed:', fallbackError);
            Alert.alert('Error', 'Failed to load shops. Please check your internet connection.');
          }
        }
      } else {
        console.log('📱 Loading shops from SQLite (offline mode)');
        
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
      }
    } catch (error) {
      console.error('❌ Error loading user shops:', error);
      Alert.alert('Error', 'Failed to load shops');
    } finally {
      setIsLoading(false);
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
      
      if (response && Array.isArray(response) && response.length > 0) {
        // Sync to SQLite
        try {
          const shopData = response[0];
          console.log('🔄 Syncing shop to SQLite:', shopData.id);
          
          const DatabaseService = require('../services/DatabaseService').default;
          
          // Insert shop into SQLite
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
          
          // Insert user-shop association
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
          
          console.log('✅ Shop synced to SQLite:', shopData.id);
        } catch (syncError) {
          console.error('❌ Failed to sync shop to SQLite:', syncError);
        }
        
        Alert.alert('Success', 'Shop created successfully');
        setShowCreateModal(false);
        resetShopForm();
        await loadUserShops();
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

  const selectShop = (shop) => {
    setCurrentShop(shop);
  };

  const lockShop = () => {
    if (!currentShop) {
      Alert.alert('Error', 'Please select a shop first');
      return;
    }

    const newLockState = !isLocked;
    setIsLocked(newLockState);
    Alert.alert('Success', newLockState ? 'Shop locked successfully' : 'Shop unlocked successfully');
  };

  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <Text style={styles.appTitle}>Vyapaar Vistaar</Text>
        <TouchableOpacity
          style={styles.moreMenuButton}
          onPress={() => setShowMoreMenu(!showMoreMenu)}
        >
          <Text style={styles.moreMenuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, {user?.name || 'User'}!</Text>
          <Text style={styles.subText}>Here's your business overview</Text>
        </View>
        
        <View style={styles.shopControls}>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={styles.dropdownText}>
                {currentShop ? currentShop.name : 'Select Shop'}
              </Text>
              <Text style={styles.dropdownIcon}>{showDropdown ? "▲" : "▼"}</Text>
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
          
          <TouchableOpacity
            style={[styles.lockButton, !currentShop && styles.disabledButton]}
            onPress={lockShop}
            disabled={!currentShop}
          >
            <Text style={styles.buttonIcon}>{isLocked ? "🔒" : "🔓"}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.createShopButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.buttonIcon}>➕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.iconPlaceholder, {backgroundColor: '#4CAF50'}]}>
              <Text style={styles.iconText}>📦</Text>
            </View>
            <Text style={styles.statNumber}>Loading...</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.iconPlaceholder, {backgroundColor: '#2196F3'}]}>
              <Text style={styles.iconText}>👥</Text>
            </View>
            <Text style={styles.statNumber}>Loading...</Text>
            <Text style={styles.statLabel}>Total Customers</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.iconPlaceholder, {backgroundColor: '#FF9800'}]}>
              <Text style={styles.iconText}>🛍</Text>
            </View>
            <Text style={styles.statNumber}>Loading...</Text>
            <Text style={styles.statLabel}>Today's Sales</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.iconPlaceholder, {backgroundColor: '#9C27B0'}]}>
              <Text style={styles.iconText}>💰</Text>
            </View>
            <Text style={styles.statNumber}>Loading...</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.iconPlaceholder, {backgroundColor: '#F44336'}]}>
              <Text style={styles.iconText}>⚠️</Text>
            </View>
            <Text style={styles.statNumber}>Loading...</Text>
            <Text style={styles.statLabel}>Low Stock Products</Text>
          </View>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <View style={styles.activityList}>
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityIcon}>📋</Text>
              <Text style={styles.emptyActivityText}>No recent activities</Text>
              <Text style={styles.emptyActivitySubtext}>
                {isLocked ? 'Start creating sales and managing your business' : 'Lock your shop to begin tracking activities'}
              </Text>
            </View>
          </View>
        </View>
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
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customHeader: {
    backgroundColor: '#1a237e',
    padding: 8,
    paddingTop: 15,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 3,
  },
  subText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  shopControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dropdownItemSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  lockButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  createShopButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  newSaleButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: (width - 50) / 2 - 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recentSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 14,
    color: '#999',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyActivity: {
    alignItems: 'center',
    padding: 40,
  },
  emptyActivityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
    marginTop: 15,
  },
  emptyActivitySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  iconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconText: {
    fontSize: 24,
  },
  dropdownIcon: {
    fontSize: 16,
    color: '#666',
  },
  buttonIcon: {
    fontSize: 16,
    color: '#fff',
  },
  emptyActivityIcon: {
    fontSize: 40,
    color: '#ccc',
  },
  moreMenuButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  moreMenuIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
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
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
};

export default DashboardScreen;
