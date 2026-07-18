import React, {useState, useEffect} from 'react';
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
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';

const SMSScreen = ({navigation}) => {
  const [smsLogs, setSmsLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [smsEnabled, setSmsEnabled] = useState(true);
  
  const {shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchQuery, smsLogs, filterStatus]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [logsResult, customersResult, templatesResult, settingsResult] = await Promise.all([
        executeQuery(`
          SELECT sl.*, c.name as customerName 
          FROM sms_logs sl
          LEFT JOIN customers c ON sl.customerId = c.id
          WHERE sl.shopId = ?
          ORDER BY sl.sentAt DESC
        `, [shop.id]),
        
        executeQuery(`
          SELECT * FROM customers 
          WHERE shopId = ? AND isCreditCustomer = 1 AND currentBalance > 0
          ORDER BY name ASC
        `, [shop.id]),
        
        executeQuery(`
          SELECT * FROM sms_templates 
          WHERE shopId = ? AND isActive = 1
          ORDER BY name ASC
        `, [shop.id]),
        
        executeQuery('SELECT settings FROM shops WHERE id = ?', [shop.id])
      ]);

      const logs = [];
      for (let i = 0; i < logsResult.rows.length; i++) {
        logs.push(logsResult.rows.item(i));
      }
      setSmsLogs(logs);

      const customerList = [];
      for (let i = 0; i < customersResult.rows.length; i++) {
        customerList.push(customersResult.rows.item(i));
      }
      setCustomers(customerList);

      const templateList = [];
      for (let i = 0; i < templatesResult.rows.length; i++) {
        templateList.push(templatesResult.rows.item(i));
      }
      setTemplates(templateList);

      if (settingsResult.rows.length > 0) {
        const settings = JSON.parse(settingsResult.rows.item(0).settings || '{}');
        setSmsEnabled(settings.smsEnabled || false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterLogs = () => {
    let filtered = smsLogs;

    if (filterStatus !== 'all') {
      filtered = smsLogs.filter(log => log.status === filterStatus);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(log =>
        log.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.phone?.includes(searchQuery) ||
        log.message?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const sendSMS = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    let message = '';
    if (selectedTemplate) {
      message = selectedTemplate.content
        .replace('{customerName}', selectedCustomer.name)
        .replace('{amount}', `₹${selectedCustomer.currentBalance.toFixed(2)}`)
        .replace('{shopName}', shop.name)
        .replace('{customerPhone}', selectedCustomer.phone || '');
    } else if (customMessage.trim()) {
      message = customMessage.trim();
    } else {
      Alert.alert('Error', 'Please select a template or enter a custom message');
      return;
    }

    try {
      const smsId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      await executeQuery(`
        INSERT INTO sms_logs (
          id, customerId, phone, message, template, status, shopId, sentAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        smsId,
        selectedCustomer.id,
        selectedCustomer.phone,
        message,
        selectedTemplate?.name || 'custom',
        'pending',
        shop.id,
        new Date().toISOString()
      ]);

      setSelectedCustomer(null);
      setSelectedTemplate(null);
      setCustomMessage('');
      setShowCustomerModal(false);
      setShowTemplateModal(false);
      
      loadData();
      Alert.alert('Success', 'SMS queued for delivery');
    } catch (error) {
      console.error('Error sending SMS:', error);
      Alert.alert('Error', 'Failed to send SMS');
    }
  };

  const sendBulkSMS = async () => {
    if (customers.length === 0) {
      Alert.alert('Info', 'No customers with outstanding payments found');
      return;
    }

    const template = templates.find(t => t.name === 'payment_reminder');
    if (!template) {
      Alert.alert('Error', 'Payment reminder template not found');
      return;
    }

    Alert.alert(
      'Bulk SMS',
      `Send payment reminders to ${customers.length} customers?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Send',
          onPress: async () => {
            try {
              for (const customer of customers) {
                const message = template.content
                  .replace('{customerName}', customer.name)
                  .replace('{amount}', `₹${customer.currentBalance.toFixed(2)}`)
                  .replace('{shopName}', shop.name);

                await executeQuery(`
                  INSERT INTO sms_logs (
                    id, customerId, phone, message, template, status, shopId, sentAt
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  Date.now().toString(36) + Math.random().toString(36).substr(2),
                  customer.id,
                  customer.phone,
                  message,
                  template.name,
                  'pending',
                  shop.id,
                  new Date().toISOString()
                ]);
              }

              loadData();
              Alert.alert('Success', `SMS queued for ${customers.length} customers`);
            } catch (error) {
              console.error('Error sending bulk SMS:', error);
              Alert.alert('Error', 'Failed to send bulk SMS');
            }
          },
        },
      ]
    );
  };

  const renderSmsItem = ({item}) => (
    <View style={styles.smsItem}>
      <View style={styles.smsHeader}>
        <Text style={styles.customerName}>
          {item.customerName || 'Unknown Customer'}
        </Text>
        <Text style={[
          styles.smsStatus,
          {color: item.status === 'sent' ? '#4CAF50' : 
                 item.status === 'failed' ? '#F44336' : '#FF9800'}
        ]}>
          {item.status}
        </Text>
      </View>
      
      <View style={styles.smsDetails}>
        <Text style={styles.phoneNumber}>{item.phone}</Text>
        <Text style={styles.sentDate}>
          {new Date(item.sentAt).toLocaleDateString()}
        </Text>
      </View>
      
      <Text style={styles.messagePreview} numberOfLines={2}>
        {item.message}
      </Text>
      
      <View style={styles.smsFooter}>
        <Text style={styles.templateName}>Template: {item.template}</Text>
        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => {
            setSelectedCustomer({id: item.customerId, name: item.customerName, phone: item.phone});
            setSelectedTemplate(templates.find(t => t.name === item.template));
            setShowCustomerModal(true);
          }}>
          <Icon name="refresh" size={16} color="#2196F3" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCustomerItem = ({item}) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => {
        setSelectedCustomer(item);
        setShowCustomerModal(false);
        setShowTemplateModal(true);
      }}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerPhone}>{item.phone}</Text>
      </View>
      <View style={styles.customerBalance}>
        <Text style={styles.balanceAmount}>₹{item.currentBalance.toFixed(2)}</Text>
        <Text style={styles.balanceLabel}>Outstanding</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTemplateItem = ({item}) => (
    <TouchableOpacity
      style={[
        styles.templateItem,
        selectedTemplate?.id === item.id && styles.selectedTemplate
      ]}
      onPress={() => setSelectedTemplate(item)}>
      <Text style={styles.templateName}>{item.name}</Text>
      <Text style={styles.templateSubject}>{item.subject}</Text>
      <Text style={styles.templatePreview} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  const FilterButton = ({title, status, count}) => (
    <TouchableOpacity
      style={[styles.filterButton, filterStatus === status && styles.activeFilter]}
      onPress={() => setFilterStatus(status)}>
      <Text style={[styles.filterButtonText, filterStatus === status && styles.activeFilterText]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  const pendingCount = smsLogs.filter(log => log.status === 'pending').length;
  const sentCount = smsLogs.filter(log => log.status === 'sent').length;
  const failedCount = smsLogs.filter(log => log.status === 'failed').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SMS & Notifications</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>SMS Enabled</Text>
          <Switch
            value={smsEnabled}
            onValueChange={setSmsEnabled}
            trackColor={{false: '#ccc', true: '#2196F3'}}
            thumbColor={smsEnabled ? '#2196F3' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search SMS logs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <FilterButton title="All" status="all" count={smsLogs.length} />
        <FilterButton title="Pending" status="pending" count={pendingCount} />
        <FilterButton title="Sent" status="sent" count={sentCount} />
        <FilterButton title="Failed" status="failed" count={failedCount} />
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowCustomerModal(true)}>
          <Icon name="message-plus" size={20} color="white" />
          <Text style={styles.actionButtonText}>Send SMS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: '#FF9800'}]}
          onPress={sendBulkSMS}>
          <Icon name="message-bulk" size={20} color="white" />
          <Text style={styles.actionButtonText}>Bulk Reminders</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredLogs}
        renderItem={renderSmsItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="message-text" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No SMS logs found</Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={false}
        visible={showCustomerModal}
        onRequestClose={() => setShowCustomerModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <View style={{width: 24}} />
          </View>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={customerSearch}
            onChangeText={setCustomerSearch}
          />
          
          <FlatList
            data={customers.filter(customer =>
              customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
              customer.phone?.includes(customerSearch)
            )}
            renderItem={renderCustomerItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No customers with outstanding payments</Text>
            }
          />
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={showTemplateModal}
        onRequestClose={() => setShowTemplateModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Template</Text>
            <View style={{width: 24}} />
          </View>
          
          <ScrollView style={styles.templateList}>
            <FlatList
              data={templates}
              renderItem={renderTemplateItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
            
            <View style={styles.customMessageSection}>
              <Text style={styles.sectionTitle}>Or send custom message:</Text>
              <TextInput
                style={styles.customMessageInput}
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder="Enter your custom message here..."
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          
          <TouchableOpacity style={styles.sendButton} onPress={sendSMS}>
            <Text style={styles.sendButtonText}>Send SMS</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
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
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  smsItem: {
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
  smsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  smsStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  smsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#666',
  },
  sentDate: {
    fontSize: 12,
    color: '#666',
  },
  messagePreview: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
    lineHeight: 20,
  },
  smsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateName: {
    fontSize: 12,
    color: '#666',
  },
  resendButton: {
    padding: 4,
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
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerInfo: {
    flex: 1,
  },
  customerBalance: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#666',
  },
  templateList: {
    flex: 1,
  },
  templateItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedTemplate: {
    backgroundColor: '#e3f2fd',
  },
  templateSubject: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  templatePreview: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  customMessageSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  customMessageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: 'white',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SMSScreen;
