import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';

const CustomerDetailScreen = ({navigation, route}) => {
  const {customerId} = route.params;
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  
  const {hasPermission, shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadCustomerDetails();
  }, []);

  const loadCustomerDetails = async () => {
    try {
      setIsLoading(true);
      
      const [customerResult, transactionsResult] = await Promise.all([
        executeQuery('SELECT * FROM customers WHERE id = ? AND shopId = ? AND (isDeleted IS NULL OR isDeleted = 0)', [customerId, shop.id || shop._id]),
        executeQuery(`
          SELECT t.*, 
                 CASE 
                   WHEN t.type = 'sale' THEN 'Sale'
                   WHEN t.type = 'payment_received' THEN 'Payment Received'
                   ELSE t.type
                 END as displayType
          FROM transactions t
          WHERE t.customerId = ? AND t.shopId = ?
          ORDER BY t.createdAt DESC
          LIMIT 50
        `, [customerId, shop.id || shop._id])
      ]);

      if (customerResult.rows.length > 0) {
        setCustomer(customerResult.rows.item(0));
        
        const transactionList = [];
        for (let i = 0; i < transactionsResult.rows.length; i++) {
          transactionList.push(transactionsResult.rows.item(i));
        }
        setTransactions(transactionList);
      } else {
        Alert.alert('Error', 'Customer not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading customer details:', error);
      Alert.alert('Error', 'Failed to load customer details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}? This action will be synced to the server.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Import SyncService at the top of the file
              const SyncService = require('../services/SyncService').default;
              
              // Use soft delete through SyncService
              await SyncService.deleteCustomer(customerId);
              Alert.alert('Success', 'Customer deleted successfully and will be synced to the server');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Error', 'Failed to delete customer');
            }
          },
        },
      ]
    );
  };

  const sendPaymentReminder = async () => {
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

  const recordPayment = async (amount) => {
    try {
      const paymentId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      await executeQuery(`
        INSERT INTO payments (
          id, customerId, amount, method, reference, notes, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        paymentId,
        customerId,
        amount,
        'cash',
        `Payment received on ${new Date().toLocaleDateString()}`,
        '',
        new Date().toISOString()
      ]);

      const newBalance = customer.currentBalance - amount;
      await executeQuery(
        'UPDATE customers SET currentBalance = ?, updatedAt = ? WHERE id = ?',
        [newBalance, new Date().toISOString(), customerId]
      );

      const transactionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      await executeQuery(`
        INSERT INTO transactions (
          id, type, invoiceNumber, customerId, userId, shopId, items,
          subtotal, tax, discount, total, paymentMethod, paymentStatus,
          notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        transactionId,
        'payment_received',
        `PAY-${Date.now()}`,
        customerId,
        shop.id,
        shop.id,
        JSON.stringify([]),
        0,
        0,
        0,
        amount,
        'cash',
        'paid',
        `Payment received: ₹${amount}`,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      loadCustomerDetails();
      Alert.alert('Success', `Payment of ₹${amount} recorded successfully`);
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    }
  };

  const showPaymentDialog = () => {
    Alert.prompt(
      'Record Payment',
      'Enter payment amount',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Record',
          onPress: (amount) => {
            const paymentAmount = parseFloat(amount);
            if (paymentAmount > 0 && paymentAmount <= customer.currentBalance) {
              recordPayment(paymentAmount);
            } else {
              Alert.alert('Error', 'Invalid payment amount');
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const renderTransactionItem = ({item}) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionType}>{item.displayType}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionInvoice}>Invoice: {item.invoiceNumber}</Text>
        <Text style={[
          styles.transactionAmount,
          item.type === 'payment_received' ? styles.paymentReceived : styles.saleAmount
        ]}>
          {item.type === 'payment_received' ? '+' : '-'}₹{item.total.toFixed(2)}
        </Text>
      </View>
      
      {item.notes && (
        <Text style={styles.transactionNotes}>{item.notes}</Text>
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

  if (!customer) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Customer not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerType}>
            {customer.isCreditCustomer ? 'Credit Customer' : 'Regular Customer'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddCustomer', {customerId})}>
          <Icon name="pencil" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.contactSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        {customer.phone && (
          <View style={styles.contactRow}>
            <Icon name="phone" size={20} color="#666" />
            <Text style={styles.contactText}>{customer.phone}</Text>
          </View>
        )}
        
        {customer.email && (
          <View style={styles.contactRow}>
            <Icon name="email" size={20} color="#666" />
            <Text style={styles.contactText}>{customer.email}</Text>
          </View>
        )}
        
        {customer.address && (
          <View style={styles.contactRow}>
            <Icon name="map-marker" size={20} color="#666" />
            <Text style={styles.contactText}>{customer.address}</Text>
          </View>
        )}
        
        {customer.gstNumber && (
          <View style={styles.contactRow}>
            {/* <Icon name="receipt-text-outline" size={20} color="#666" /> */}
            <Text style={styles.contactText}>GST: {customer.gstNumber}</Text>
          </View>
        )}
      </View>

      {customer.isCreditCustomer && (
        <View style={styles.creditSection}>
          <Text style={styles.sectionTitle}>Credit Information</Text>
          
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Credit Limit:</Text>
            <Text style={styles.creditValue}>₹{customer.creditLimit.toFixed(2)}</Text>
          </View>
          
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Current Balance:</Text>
            <Text style={[
              styles.creditValue,
              customer.currentBalance > 0 ? styles.outstanding : styles.settled
            ]}>
              ₹{Math.abs(customer.currentBalance).toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Available Credit:</Text>
            <Text style={styles.creditValue}>
              ₹{(customer.creditLimit - customer.currentBalance).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}>
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>
        
        {customer.isCreditCustomer && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
            onPress={() => setActiveTab('payments')}>
            <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>
              Payments
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'transactions' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          
          {transactions.length > 0 ? (
            <FlatList
              data={transactions}
              renderItem={renderTransactionItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No transactions found</Text>
          )}
        </View>
      )}

      {activeTab === 'payments' && customer.isCreditCustomer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Actions</Text>
          
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={showPaymentDialog}>
            <Icon name="cash-plus" size={20} color="white" />
            <Text style={styles.paymentButtonText}>Record Payment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.paymentButton, {backgroundColor: '#2196F3'}]}
            onPress={sendPaymentReminder}>
            <Icon name="message-text" size={20} color="white" />
            <Text style={styles.paymentButtonText}>Send Payment Reminder</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('NewSale', {selectedCustomer: customer})}>
          <Icon name="cart-plus" size={20} color="white" />
          <Text style={styles.actionButtonText}>New Sale</Text>
        </TouchableOpacity>

        {hasPermission('manager') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDelete}>
            <Icon name="delete" size={20} color="white" />
            <Text style={styles.actionButtonText}>Delete Customer</Text>
          </TouchableOpacity>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  customerType: {
    fontSize: 16,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 20,
  },
  contactSection: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  creditSection: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  creditLabel: {
    fontSize: 16,
    color: '#666',
  },
  creditValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  outstanding: {
    color: '#F44336',
  },
  settled: {
    color: '#4CAF50',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginTop: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  transactionItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInvoice: {
    fontSize: 14,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  saleAmount: {
    color: '#F44336',
  },
  paymentReceived: {
    color: '#4CAF50',
  },
  transactionNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  actions: {
    padding: 20,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default CustomerDetailScreen;
