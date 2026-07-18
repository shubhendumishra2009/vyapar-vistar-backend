import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../contexts/AuthContext';
import {useDatabase} from '../contexts/DatabaseContext';

const SettingsScreen = ({navigation}) => {
  const [shopSettings, setShopSettings] = useState({
    currency: 'INR',
    taxEnabled: true,
    taxRate: 18,
    smsEnabled: true,
    printEnabled: true,
    barcodeEnabled: true,
    lowStockAlert: true,
    lowStockThreshold: 10,
  });
  const [shopInfo, setShopInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const {user, logout, shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      const result = await executeQuery(
        'SELECT * FROM shops WHERE id = ?',
        [shop.id]
      );
      
      if (result.rows.length > 0) {
        const shopData = result.rows.item(0);
        setShopInfo({
          name: shopData.name || '',
          address: shopData.address || '',
          phone: shopData.phone || '',
          email: shopData.email || '',
          gstNumber: shopData.gstNumber || '',
        });
        
        const settings = JSON.parse(shopData.settings || '{}');
        setShopSettings({
          currency: settings.currency || 'INR',
          taxEnabled: settings.taxEnabled !== false,
          taxRate: settings.taxRate || 18,
          smsEnabled: settings.smsEnabled !== false,
          printEnabled: settings.printEnabled !== false,
          barcodeEnabled: settings.barcodeEnabled !== false,
          lowStockAlert: settings.lowStockAlert !== false,
          lowStockThreshold: settings.lowStockThreshold || 10,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      const updatedSettings = JSON.stringify(shopSettings);
      
      await executeQuery(`
        UPDATE shops SET 
          name = ?, address = ?, phone = ?, email = ?, gstNumber = ?, 
          settings = ?, updatedAt = ?
        WHERE id = ?
      `, [
        shopInfo.name,
        shopInfo.address,
        shopInfo.phone,
        shopInfo.email,
        shopInfo.gstNumber,
        updatedSettings,
        new Date().toISOString(),
        shop.id
      ]);
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const resetDatabase = () => {
    Alert.alert(
      'Reset Database',
      'This will delete all your data. This action cannot be undone. Are you sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await executeQuery('DELETE FROM transactions WHERE shopId = ?', [shop.id]);
              await executeQuery('DELETE FROM customers WHERE shopId = ?', [shop.id]);
              await executeQuery('DELETE FROM products WHERE shopId = ?', [shop.id]);
              await executeQuery('DELETE FROM inventory_logs WHERE shopId = ?', [shop.id]);
              await executeQuery('DELETE FROM sms_logs WHERE shopId = ?', [shop.id]);
              
              Alert.alert('Success', 'Database reset successfully');
              navigation.navigate('Dashboard');
            } catch (error) {
              console.error('Error resetting database:', error);
              Alert.alert('Error', 'Failed to reset database');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({title, subtitle, value, onToggle, type = 'toggle'}) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      
      {type === 'toggle' && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{false: '#ccc', true: '#2196F3'}}
          thumbColor={value ? '#2196F3' : '#f4f3f4'}
        />
      )}
      
      {type === 'input' && (
        <TextInput
          style={styles.settingInput}
          value={value}
          onChangeText={onToggle}
          keyboardType="numeric"
        />
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Shop Name</Text>
          <TextInput
            style={styles.input}
            value={shopInfo.name}
            onChangeText={(text) => setShopInfo({...shopInfo, name: text})}
            placeholder="Enter shop name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={shopInfo.address}
            onChangeText={(text) => setShopInfo({...shopInfo, address: text})}
            placeholder="Enter shop address"
            multiline
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={shopInfo.phone}
            onChangeText={(text) => setShopInfo({...shopInfo, phone: text})}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={shopInfo.email}
            onChangeText={(text) => setShopInfo({...shopInfo, email: text})}
            placeholder="Enter email address"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>GST Number</Text>
          <TextInput
            style={styles.input}
            value={shopInfo.gstNumber}
            onChangeText={(text) => setShopInfo({...shopInfo, gstNumber: text})}
            placeholder="Enter GST number"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Settings</Text>
        
        <SettingItem
          title="Enable Tax"
          subtitle="Apply tax on sales"
          value={shopSettings.taxEnabled}
          onToggle={(value) => setShopSettings({...shopSettings, taxEnabled: value})}
        />
        
        {shopSettings.taxEnabled && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tax Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={shopSettings.taxRate.toString()}
              onChangeText={(text) => setShopSettings({...shopSettings, taxRate: parseFloat(text) || 0})}
              keyboardType="numeric"
            />
          </View>
        )}
        
        <SettingItem
          title="Enable SMS"
          subtitle="Send SMS notifications"
          value={shopSettings.smsEnabled}
          onToggle={(value) => setShopSettings({...shopSettings, smsEnabled: value})}
        />
        
        <SettingItem
          title="Enable Printing"
          subtitle="Print receipts and invoices"
          value={shopSettings.printEnabled}
          onToggle={(value) => setShopSettings({...shopSettings, printEnabled: value})}
        />
        
        <SettingItem
          title="Enable Barcode"
          subtitle="Use barcode scanning"
          value={shopSettings.barcodeEnabled}
          onToggle={(value) => setShopSettings({...shopSettings, barcodeEnabled: value})}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory Settings</Text>
        
        <SettingItem
          title="Low Stock Alert"
          subtitle="Alert when stock is low"
          value={shopSettings.lowStockAlert}
          onToggle={(value) => setShopSettings({...shopSettings, lowStockAlert: value})}
        />
        
        {shopSettings.lowStockAlert && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Low Stock Threshold</Text>
            <TextInput
              style={styles.input}
              value={shopSettings.lowStockThreshold.toString()}
              onChangeText={(text) => setShopSettings({...shopSettings, lowStockThreshold: parseInt(text) || 10})}
              keyboardType="numeric"
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Account</Text>
        
        <View style={styles.userInfo}>
          <Icon name="account" size={40} color="#2196F3" />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userType}>Role: {user?.type}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={20} color="white" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={resetDatabase}>
          <Icon name="database-remove-outline" size={20} color="white" />
          <Text style={styles.dangerButtonText}>Reset Database</Text>
        </TouchableOpacity>
        
        <Text style={styles.warningText}>
          Warning: This will delete all your data including products, customers, and sales.
        </Text>
      </View>

      <View style={styles.saveSection}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          disabled={isSaving}>
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
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
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userDetails: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userType: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  warningText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  saveSection: {
    padding: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
