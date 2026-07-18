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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';

const SalesScreen = ({navigation}) => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const {shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchQuery, sales, filterStatus]);

  const loadSales = async () => {
    try {
      setIsLoading(true);
      const result = await executeQuery(`
        SELECT t.*, c.name as customerName, c.phone as customerPhone
        FROM transactions t
        LEFT JOIN customers c ON t.customerId = c.id
        WHERE t.shopId = ? AND t.type = 'sale'
        ORDER BY t.createdAt DESC
      `, [shop.id]);
      
      const salesList = [];
      for (let i = 0; i < result.rows.length; i++) {
        salesList.push(result.rows.item(i));
      }
      
      setSales(salesList);
    } catch (error) {
      console.error('Error loading sales:', error);
      Alert.alert('Error', 'Failed to load sales');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterSales = () => {
    let filtered = sales;

    if (filterStatus !== 'all') {
      filtered = sales.filter(sale => sale.paymentStatus === filterStatus);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(sale =>
        sale.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.customerPhone?.includes(searchQuery)
      );
    }

    setFilteredSales(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  const showSaleDetails = (sale) => {
    setSelectedSale(sale);
    setModalVisible(true);
  };

  const renderSaleItem = ({item}) => (
    <TouchableOpacity
      style={styles.saleItem}
      onPress={() => showSaleDetails(item)}>
      <View style={styles.saleHeader}>
        <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
        <Text style={[
          styles.paymentStatus,
          {color: item.paymentStatus === 'paid' ? '#4CAF50' : '#FF9800'}
        ]}>
          {item.paymentStatus}
        </Text>
      </View>
      
      <View style={styles.saleDetails}>
        <Text style={styles.customerName}>
          {item.customerName || 'Walk-in Customer'}
        </Text>
        <Text style={styles.saleDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.saleAmount}>
        <Text style={styles.totalAmount}>₹{item.total.toFixed(2)}</Text>
        <Text style={styles.itemCount}>
          {JSON.parse(item.items || '[]').length} items
        </Text>
      </View>
      
      <View style={styles.saleActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('SaleDetail', {saleId: item.id})}>
          <Icon name="eye" size={20} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('NewSale', {duplicateSale: item})}>
          <Icon name="content-copy" size={20} color="#FF9800" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const SaleDetailModal = () => {
    if (!selectedSale) return null;

    const items = JSON.parse(selectedSale.items || '[]');

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sale Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Invoice:</Text>
                <Text style={styles.detailValue}>{selectedSale.invoiceNumber}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>
                  {selectedSale.customerName || 'Walk-in Customer'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedSale.createdAt).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{selectedSale.paymentMethod}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Status:</Text>
                <Text style={[
                  styles.detailValue,
                  {color: selectedSale.paymentStatus === 'paid' ? '#4CAF50' : '#FF9800'}
                ]}>
                  {selectedSale.paymentStatus}
                </Text>
              </View>
              
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    <Text style={styles.itemPrice}>₹{item.totalPrice.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>₹{selectedSale.subtotal.toFixed(2)}</Text>
                </View>
                
                {selectedSale.tax > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax:</Text>
                    <Text style={styles.summaryValue}>₹{selectedSale.tax.toFixed(2)}</Text>
                  </View>
                )}
                
                {selectedSale.discount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Discount:</Text>
                    <Text style={styles.summaryValue}>-₹{selectedSale.discount.toFixed(2)}</Text>
                  </View>
                )}
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>₹{selectedSale.total.toFixed(2)}</Text>
                </View>
              </View>
              
              {selectedSale.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.notesText}>{selectedSale.notes}</Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('SaleDetail', {saleId: selectedSale.id});
                }}>
                <Text style={styles.modalButtonText}>View Full Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, {backgroundColor: '#FF9800'}]}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('NewSale', {duplicateSale: selectedSale});
                }}>
                <Text style={styles.modalButtonText}>Duplicate Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const FilterButton = ({title, status, count}) => (
    <TouchableOpacity
      style={[styles.filterButton, filterStatus === status && styles.activeFilter]}
      onPress={() => setFilterStatus(status)}>
      <Text style={[styles.filterButtonText, filterStatus === status && styles.activeFilterText]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  const paidSales = sales.filter(s => s.paymentStatus === 'paid').length;
  const pendingSales = sales.filter(s => s.paymentStatus === 'pending').length;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sales..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <FilterButton title="All" status="all" count={sales.length} />
        <FilterButton title="Paid" status="paid" count={paidSales} />
        <FilterButton title="Pending" status="pending" count={pendingSales} />
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('NewSale')}>
        <Icon name="plus" size={20} color="white" />
        <Text style={styles.addButtonText}>New Sale</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredSales}
        renderItem={renderSaleItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {/* <Icon name="receipt-text-outline" size={64} color="#ccc" /> */}
            <Text style={styles.emptyText}>No sales found</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('NewSale')}>
              <Text style={styles.emptyButtonText}>Create Your First Sale</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <SaleDetailModal />
    </View>
  );
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  saleItem: {
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
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  saleDate: {
    fontSize: 14,
    color: '#666',
  },
  saleAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  saleActions: {
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
  itemsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 10,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  summarySection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  notesSection: {
    marginTop: 20,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
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

export default SalesScreen;
