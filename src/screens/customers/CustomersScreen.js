import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';
import SyncService from '../../services/SyncService';

const CustomersScreen = ({navigation}) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState('all');
  
  const {hasPermission, shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers, filterType]);

  // Refresh customers when screen comes into focus (e.g., returning from AddCustomerScreen)
  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [shop])
  );

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const result = await executeQuery(`
        SELECT * FROM customers 
        WHERE shopId = ? AND (isDeleted IS NULL OR isDeleted = 0)
        ORDER BY name ASC
      `, [shop.id || shop._id]);
      
      const customerList = [];
      for (let i = 0; i < result.rows.length; i++) {
        customerList.push(result.rows.item(i));
      }
      
      setCustomers(customerList);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (filterType === 'credit') {
      filtered = customers.filter(customer => customer.isCreditCustomer);
    } else if (filterType === 'outstanding') {
      filtered = customers.filter(customer => customer.currentBalance > 0);
    } else if (filterType === 'regular') {
      filtered = customers.filter(customer => !customer.isCreditCustomer);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCustomers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  const handleDelete = (customer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await SyncService.deleteCustomer(customer.id);
              loadCustomers();
              Alert.alert('Success', 'Customer deleted successfully');
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Error', 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const showCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setModalVisible(true);
  };

  const sendPaymentReminder = async (customer) => {
    try {
      const templateResult = await executeQuery(
        'SELECT * FROM sms_templates WHERE name = ? AND shopId = ?',
        ['payment_reminder', shop.id]
      );

      if (templateResult.rows.length > 0) {
        const template = templateResult.rows.item(0);
        const message = template.content
          .replace('{customerName}', customer.name)
          .replace('{amount}', `₹${customer.currentBalance.toFixed(2)}`)
          .replace('{shopName}', shop.name);

        await executeQuery(`
          INSERT INTO sms_logs (id, customerId, phone, message, template, status, shopId, sentAt)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [
          Date.now().toString(36) + Math.random().toString(36).substr(2),
          customer.id,
          customer.phone,
          message,
          template.name,
          shop.id,
          new Date().toISOString()
        ]);

        Alert.alert('Success', 'Payment reminder SMS queued for delivery');
      } else {
        Alert.alert('Error', 'SMS template not found');
      }
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      Alert.alert('Error', 'Failed to send payment reminder');
    }
  };

  const renderCustomerItem = ({item}) => {
    if (!item) {
      return null; // Safety check for undefined item
    }
    
    return (
      <TouchableOpacity
        style={styles.customerItem}
        onPress={() => showCustomerDetails(item)}
        onLongPress={() => hasPermission('manager') && handleDelete(item)}>
        <View style={styles.customerHeader}>
          <Text style={styles.customerName}>{item.name || 'Unknown Customer'}</Text>
        <View style={styles.customerType}>
          {item.isCreditCustomer ? (
            <Icon name="credit-card" size={16} color="#FF9800" />
          ) : (
            <Icon name="cash" size={16} color="#4CAF50" />
          )}
        </View>
      </View>
      
      <View style={styles.customerDetails}>
        {item.phone && (
          <Text style={styles.customerPhone}>{item.phone}</Text>
        )}
        {item.email && (
          <Text style={styles.customerEmail}>{item.email}</Text>
        )}
      </View>
      
      {item.isCreditCustomer && (
        <View style={styles.creditContainer}>
          <Text style={styles.creditLabel}>Outstanding:</Text>
          <Text style={[
            styles.creditAmount,
            item.currentBalance > 0 ? styles.outstanding : styles.settled
          ]}>
            {'₹'}{Math.abs(item.currentBalance).toFixed(2)}
          </Text>
          {item.currentBalance > 0 && (
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={() => sendPaymentReminder(item)}>
              <Icon name="message-text" size={16} color="#2196F3" />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <View style={styles.customerActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CustomerDetail', {customerId: item.id})}>
          <Icon name="eye" size={20} color="#2196F3" />
        </TouchableOpacity>
        {hasPermission('manager') && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e?.stopPropagation?.();
                navigation.navigate('AddCustomer', {customerId: item.id});
              }}>
              <Icon name="pencil" size={20} color="#FF9800" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e?.stopPropagation?.();
                console.log('Delete button pressed for:', item.name);
                handleDelete(item);
              }}>
              <Icon name="delete" size={20} color="#F44336" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const CustomerDetailModal = () => {
    if (!selectedCustomer) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{selectedCustomer.name}</Text>
              </View>
              
              {selectedCustomer.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.phone || 'No phone'}</Text>
                </View>
              )}
              
              {selectedCustomer.email && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.email || 'No email'}</Text>
                </View>
              )}
              
              {selectedCustomer.address && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.address || 'No address'}</Text>
                </View>
              )}
              
              {selectedCustomer.gstNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>GST Number:</Text>
                  <Text style={styles.detailValue}>{selectedCustomer.gstNumber || 'No GST'}</Text>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer Type:</Text>
                <Text style={styles.detailValue}>
                  {selectedCustomer.isCreditCustomer ? 'Credit Customer' : 'Regular Customer'}
                </Text>
              </View>
              
              {selectedCustomer.isCreditCustomer && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Credit Limit:</Text>
                    <Text style={styles.detailValue}>₹{selectedCustomer.creditLimit.toFixed(2)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Current Balance:</Text>
                    <Text style={[
                      styles.detailValue,
                      selectedCustomer.currentBalance > 0 ? styles.outstandingText : null
                    ]}>
                      ₹{Math.abs(selectedCustomer.currentBalance).toFixed(2)}
                      {selectedCustomer.currentBalance > 0 ? ' (Due)' : ' (Settled)'}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('CustomerDetail', {customerId: selectedCustomer.id});
                }}>
                <Text style={styles.modalButtonText}>View Full Details</Text>
              </TouchableOpacity>
              
              {hasPermission('manager') && (
                <TouchableOpacity
                  style={[styles.modalButton, {backgroundColor: '#FF9800'}]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('AddCustomer', {customerId: selectedCustomer.id});
                  }}>
                  <Text style={styles.modalButtonText}>Edit Customer</Text>
                </TouchableOpacity>
              )}
              
              {selectedCustomer.isCreditCustomer && selectedCustomer.currentBalance > 0 && (
                <TouchableOpacity
                  style={[styles.modalButton, {backgroundColor: '#2196F3'}]}
                  onPress={() => {
                    setModalVisible(false);
                    sendPaymentReminder(selectedCustomer);
                  }}>
                  <Text style={styles.modalButtonText}>Send Payment Reminder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const FilterButton = ({title, type, count}) => (
    <TouchableOpacity
      style={[styles.filterButton, filterType === type && styles.activeFilter]}
      onPress={() => setFilterType(type)}>
      <Text style={[styles.filterButtonText, filterType === type && styles.activeFilterText]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  const creditCustomers = customers.filter(c => c.isCreditCustomer).length;
  const outstandingCustomers = customers.filter(c => c.currentBalance > 0).length;
  const regularCustomers = customers.filter(c => !c.isCreditCustomer).length;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <FilterButton title="All" type="all" count={customers.length} />
        <FilterButton title="Credit" type="credit" count={creditCustomers} />
        <FilterButton title="Outstanding" type="outstanding" count={outstandingCustomers} />
        <FilterButton title="Regular" type="regular" count={regularCustomers} />
      </View>

      <View style={styles.buttonContainer}>
        {hasPermission('manager') && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddCustomer')}>
            <Icon name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Customer</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.deletedButton}
          onPress={() => navigation.navigate('DeletedCustomers')}>
          <Icon name="trash-can-outline" size={20} color="white" />
          <Text style={styles.addButtonText}>Deleted</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-group" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No customers found</Text>
            {hasPermission('manager') && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddCustomer')}>
                <Text style={styles.emptyButtonText}>Add Your First Customer</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <CustomerDetailModal />
    </View>
  );
}
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  filterButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    borderRadius: 5,
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  deletedButton: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  customerItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  customerType: {
    marginLeft: 10,
  },
  customerDetails: {
    marginBottom: 8,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
  },
  creditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 5,
  },
  creditLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  creditAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  outstanding: {
    color: '#F44336',
  },
  settled: {
    color: '#4CAF50',
  },
  reminderButton: {
    padding: 4,
  },
  customerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 8,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  outstandingText: {
    color: '#F44336',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CustomersScreen;
