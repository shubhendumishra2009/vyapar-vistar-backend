import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';
import SyncService from '../../services/SyncService';

const AddCustomerScreen = ({navigation, route}) => {
  const customerId = route.params?.customerId;
  const isEditing = !!customerId;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    isCreditCustomer: false,
    creditLimit: '0',
    currentBalance: '0',
  });

  const [isLoading, setIsLoading] = useState(false);
  
  const {shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    if (isEditing) {
      loadCustomer();
    }
  }, []);

  const loadCustomer = async () => {
    try {
      setIsLoading(true);
      const result = await executeQuery(
        'SELECT * FROM customers WHERE id = ? AND shopId = ? AND (isDeleted IS NULL OR isDeleted = 0)',
        [customerId, shop.id || shop._id]
      );
      
      if (result.rows.length > 0) {
        const customer = result.rows.item(0);
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          gstNumber: customer.gstNumber || '',
          isCreditCustomer: customer.isCreditCustomer || false,
          creditLimit: customer.creditLimit?.toString() || '0',
          currentBalance: customer.currentBalance?.toString() || '0',
        });
      } else {
        Alert.alert('Error', 'Customer not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      Alert.alert('Error', 'Failed to load customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }
    if (formData.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (formData.isCreditCustomer && (!formData.creditLimit || parseFloat(formData.creditLimit) < 0)) {
      Alert.alert('Error', 'Valid credit limit is required for credit customers');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // Check if shop is available
      if (!shop || (!shop.id && !shop._id)) {
        console.log('Shop data missing:', shop);
        Alert.alert('Error', 'Shop data not available. Please login again or restart the app.');
        return;
      }

      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        gstNumber: formData.gstNumber.trim(),
        isCreditCustomer: formData.isCreditCustomer,
        creditLimit: formData.isCreditCustomer ? parseFloat(formData.creditLimit) : 0,
        currentBalance: formData.isCreditCustomer ? parseFloat(formData.currentBalance) : 0,
        shopId: shop.id || shop._id,
        updatedAt: new Date().toISOString(),
      };

      // Debug logging
      console.log('Customer Debug - Shop data:', shop);
      console.log('Customer Debug - ShopId being used:', shop.id || shop._id);
      console.log('Customer Debug - Customer data:', customerData);

      if (isEditing) {
        // Get current syncVersion and increment it
        const currentResult = await executeQuery(
          'SELECT syncVersion FROM customers WHERE id = ?',
          [customerId]
        );
        const currentSyncVersion = currentResult.rows.length > 0 ? (currentResult.rows.item(0).syncVersion || 0) : 0;
        const newSyncVersion = currentSyncVersion + 1;

        await executeQuery(`
          UPDATE customers SET 
            name = ?, phone = ?, email = ?, address = ?, gstNumber = ?,
            isCreditCustomer = ?, creditLimit = ?, currentBalance = ?, 
            updatedAt = ?, syncVersion = ?
          WHERE id = ?
        `, [
          customerData.name, customerData.phone, customerData.email, customerData.address,
          customerData.gstNumber, customerData.isCreditCustomer, customerData.creditLimit,
          customerData.currentBalance, customerData.updatedAt, newSyncVersion, customerId
        ]);
        
        Alert.alert('Success', 'Customer updated successfully');
      } else {
        const newCustomerId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        await executeQuery(`
          INSERT INTO customers (
            id, name, phone, email, address, gstNumber, isCreditCustomer,
            creditLimit, currentBalance, shopId, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newCustomerId, customerData.name, customerData.phone, customerData.email,
          customerData.address, customerData.gstNumber, customerData.isCreditCustomer,
          customerData.creditLimit, customerData.currentBalance, customerData.shopId,
          new Date().toISOString(), customerData.updatedAt
        ]);
        
        Alert.alert('Success', 'Customer added successfully');
      }

      // Trigger background sync
      SyncService.forceSync().catch(err => console.log('Sync failed:', err));

      navigation.goBack();
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Error', 'Failed to save customer');
    } finally {
      setIsLoading(false);
    }
  };

  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>
          {isEditing ? 'Edit Customer' : 'Add New Customer'}
        </Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Customer Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            placeholder="Enter customer name"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            keyboardType="phone-pad"
            placeholder="Enter phone number"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            keyboardType="email-address"
            placeholder="Enter email"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => handleInputChange('address', text)}
            multiline={true}
            placeholder="Enter address"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>GST Number</Text>
          <TextInput
            style={styles.input}
            value={formData.gstNumber}
            onChangeText={(text) => handleInputChange('gstNumber', text)}
            placeholder="Enter GST number"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Credit Customer</Text>
          <Switch
            value={formData.isCreditCustomer}
            onValueChange={(value) => handleInputChange('isCreditCustomer', value)}
            trackColor={{false: '#ccc', true: '#2196F3'}}
            thumbColor={formData.isCreditCustomer ? '#2196F3' : '#f4f3f4'}
          />
        </View>

        {formData.isCreditCustomer && (
          <>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Credit Limit *</Text>
              <TextInput
                style={styles.input}
                value={formData.creditLimit}
                onChangeText={(text) => handleInputChange('creditLimit', text)}
                keyboardType="numeric"
                placeholder="Enter credit limit"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Current Balance</Text>
              <TextInput
                style={styles.input}
                value={formData.currentBalance}
                onChangeText={(text) => handleInputChange('currentBalance', text)}
                keyboardType="numeric"
                placeholder="Enter current balance"
              />
            </View>

            <View style={styles.infoBox}>
              <Icon name="information" size={20} color="#2196F3" />
              <Text style={styles.infoText}>
                Credit customers can make purchases on credit. Their outstanding balance will be tracked and payment reminders can be sent via SMS.
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {isEditing ? 'Update Customer' : 'Add Customer'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 10,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddCustomerScreen;
