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
import SyncService from '../../services/SyncService';

const InventoryScreen = ({navigation}) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [stockType, setStockType] = useState('add');
  
  const {shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, products, filterType]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const result = await executeQuery(`
        SELECT * FROM products 
        WHERE shopId = ? AND isActive = 1 
        ORDER BY name ASC
      `, [shop.id]);
      
      const productList = [];
      for (let i = 0; i < result.rows.length; i++) {
        productList.push(result.rows.item(i));
      }
      
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (filterType === 'low') {
      filtered = products.filter(product => product.stock <= product.minStock);
    } else if (filterType === 'out') {
      filtered = products.filter(product => product.stock === 0);
    } else if (filterType === 'over') {
      filtered = products.filter(product => product.stock >= product.maxStock);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const showProductDetails = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const updateStock = async () => {
    if (!stockQuantity || parseInt(stockQuantity) === 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!stockReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for stock adjustment');
      return;
    }

    try {
      const quantity = parseInt(stockQuantity);
      const previousStock = selectedProduct.stock;
      const newStock = stockType === 'add' ? previousStock + quantity : previousStock - quantity;

      if (newStock < 0) {
        Alert.alert('Error', 'Insufficient stock for removal');
        return;
      }

      await executeQuery(
        'UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?',
        [newStock, new Date().toISOString(), selectedProduct.id]
      );

      await executeQuery(`
        INSERT INTO inventory_logs (
          id, productId, transactionId, type, quantity, previousStock, newStock, reason, createdAt, shopId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        Date.now().toString(36) + Math.random().toString(36).substr(2),
        selectedProduct.id,
        null,
        stockType === 'add' ? 'stock_added' : 'stock_removed',
        stockType === 'add' ? quantity : -quantity,
        previousStock,
        newStock,
        stockReason,
        new Date().toISOString(),
        shop.id
      ]);

      loadProducts();
      setStockModalVisible(false);
      setStockQuantity('');
      setStockReason('');

      // Trigger background sync
      SyncService.forceSync().catch(err => console.log('Sync failed:', err));

      Alert.alert('Success', 'Stock updated successfully');
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock');
    }
  };

  const getStockStatus = (product) => {
    if (product.stock === 0) {
      return {status: 'Out of Stock', color: '#F44336', icon: 'alert-circle'};
    } else if (product.stock <= product.minStock) {
      return {status: 'Low Stock', color: '#FF9800', icon: 'alert'};
    } else if (product.stock >= product.maxStock) {
      return {status: 'Overstocked', color: '#9C27B0', icon: 'package-up'};
    } else {
      return {status: 'In Stock', color: '#4CAF50', icon: 'check-circle'};
    }
  };

  const renderProductItem = ({item}) => {
    const stockStatus = getStockStatus(item);
    
    return (
      <TouchableOpacity
        style={styles.productItem}
        onPress={() => showProductDetails(item)}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.stockStatusContainer}>
            <Icon name={stockStatus.icon} size={16} color={stockStatus.color} />
            <Text style={[styles.stockStatus, {color: stockStatus.color}]}>
              {stockStatus.status}
            </Text>
          </View>
        </View>
        
        <View style={styles.productDetails}>
          {item.sku && (
            <Text style={styles.productSku}>SKU: {item.sku}</Text>
          )}
          {item.category && (
            <Text style={styles.productCategory}>{item.category}</Text>
          )}
        </View>
        
        <View style={styles.stockInfo}>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Current Stock:</Text>
            <Text style={styles.stockValue}>{item.stock} {item.unit}</Text>
          </View>
          
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Min/Max:</Text>
            <Text style={styles.stockRange}>
              {item.minStock} - {item.maxStock} {item.unit}
            </Text>
          </View>
        </View>
        
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedProduct(item);
              setStockType('add');
              setStockModalVisible(true);
            }}>
            <Icon name="plus-circle" size={20} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedProduct(item);
              setStockType('remove');
              setStockModalVisible(true);
            }}>
            <Icon name="minus-circle" size={20} color="#F44336" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProductDetail', {productId: item.id})}>
            <Icon name="eye" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({title, type, count, icon, color}) => (
    <TouchableOpacity
      style={[styles.filterButton, filterType === type && styles.activeFilter]}
      onPress={() => setFilterType(type)}>
      <Icon name={icon} size={16} color={filterType === type ? 'white' : color} />
      <Text style={[styles.filterButtonText, filterType === type && styles.activeFilterText]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  const lowStockCount = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const overstockCount = products.filter(p => p.stock >= p.maxStock).length;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <FilterButton title="All" type="all" count={products.length} icon="package-variant" color="#666" />
        <FilterButton title="Low Stock" type="low" count={lowStockCount} icon="alert-outline" color="#FF9800" />
        <FilterButton title="Out of Stock" type="out" count={outOfStockCount} icon="alert-circle-outline" color="#F44336" />
        <FilterButton title="Overstock" type="over" count={overstockCount} icon="package-up" color="#9C27B0" />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="package-variant" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {filterType === 'low' ? 'No products with low stock' :
               filterType === 'out' ? 'No products out of stock' :
               filterType === 'over' ? 'No overstocked products' :
               'No products found'}
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={stockModalVisible}
        onRequestClose={() => setStockModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {stockType === 'add' ? 'Add Stock' : 'Remove Stock'}
              </Text>
              <TouchableOpacity onPress={() => setStockModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedProduct && (
              <View style={styles.modalBody}>
                <Text style={styles.productInfo}>{selectedProduct.name}</Text>
                <Text style={styles.currentStock}>
                  Current Stock: {selectedProduct.stock} {selectedProduct.unit}
                </Text>
                
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Quantity:</Text>
                  <TextInput
                    style={styles.input}
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    keyboardType="numeric"
                    placeholder="Enter quantity"
                  />
                </View>
                
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Reason:</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={stockReason}
                    onChangeText={setStockReason}
                    placeholder="Enter reason for stock adjustment"
                    multiline
                  />
                </View>
                
                <TouchableOpacity style={styles.updateButton} onPress={updateStock}>
                  <Text style={styles.updateButtonText}>
                    {stockType === 'add' ? 'Add Stock' : 'Remove Stock'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 8,
    margin: 2,
    borderRadius: 5,
    elevation: 1,
  },
  activeFilter: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  activeFilterText: {
    color: 'white',
    fontWeight: 'bold',
  },
  productItem: {
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
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  stockStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  productDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productSku: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
  },
  stockInfo: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  stockLabel: {
    fontSize: 14,
    color: '#666',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  stockRange: {
    fontSize: 14,
    color: '#666',
  },
  productActions: {
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
  productInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  currentStock: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
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
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  updateButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InventoryScreen;
