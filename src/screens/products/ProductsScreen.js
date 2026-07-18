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

const ProductsScreen = ({navigation}) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const {hasPermission, shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, products]);

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
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleDelete = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await executeQuery(
                'UPDATE products SET isActive = 0, updatedAt = ? WHERE id = ?',
                [new Date().toISOString(), product.id]
              );
              loadProducts();

              // Trigger background sync
              SyncService.forceSync().catch(err => console.log('Sync failed:', err));

              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const showProductDetails = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const renderProductItem = ({item}) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => showProductDetails(item)}
      onLongPress={() => hasPermission('manager') && handleDelete(item)}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>₹{item.sellingPrice}</Text>
      </View>
      
      <View style={styles.productDetails}>
        {item.sku && (
          <Text style={styles.productSku}>SKU: {item.sku}</Text>
        )}
        {item.category && (
          <Text style={styles.productCategory}>{item.category}</Text>
        )}
      </View>
      
      <View style={styles.stockContainer}>
        <Text style={[
          styles.stockText,
          item.stock <= item.minStock ? styles.lowStock : styles.normalStock
        ]}>
          Stock: {item.stock}
        </Text>
        {item.stock <= item.minStock && (
          <Text style={styles.alertIcon}>⚠️</Text>
        )}
      </View>
      
      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ProductDetail', {productId: item.id})}>
          <Text style={styles.actionIcon}>👁️</Text>
        </TouchableOpacity>
        {hasPermission('manager') && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddProduct', {productId: item.id})}>
            <Text style={styles.actionIcon}>✏️️</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const ProductDetailModal = () => {
    if (!selectedProduct) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Product Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>❌</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{selectedProduct.name}</Text>
              </View>
              
              {selectedProduct.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.description}</Text>
                </View>
              )}
              
              {selectedProduct.sku && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SKU:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.sku}</Text>
                </View>
              )}
              
              {selectedProduct.barcode && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Barcode:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.barcode}</Text>
                </View>
              )}
              
              {selectedProduct.category && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.category}</Text>
                </View>
              )}
              
              {selectedProduct.brand && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Brand:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.brand}</Text>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Unit:</Text>
                <Text style={styles.detailValue}>{selectedProduct.unit}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purchase Price:</Text>
                <Text style={styles.detailValue}>₹{selectedProduct.purchasePrice}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Selling Price:</Text>
                <Text style={styles.detailValue}>₹{selectedProduct.sellingPrice}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tax Rate:</Text>
                <Text style={styles.detailValue}>{selectedProduct.taxRate}%</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Stock:</Text>
                <Text style={[
                  styles.detailValue,
                  selectedProduct.stock <= selectedProduct.minStock ? styles.lowStockText : null
                ]}>
                  {selectedProduct.stock} units
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Min Stock:</Text>
                <Text style={styles.detailValue}>{selectedProduct.minStock} units</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Max Stock:</Text>
                <Text style={styles.detailValue}>{selectedProduct.maxStock} units</Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('ProductDetail', {productId: selectedProduct.id});
                }}>
                <Text style={styles.modalButtonText}>View Full Details</Text>
              </TouchableOpacity>
              
              {hasPermission('manager') && (
                <TouchableOpacity
                  style={[styles.modalButton, {backgroundColor: '#FF9800'}]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('AddProduct', {productId: selectedProduct.id});
                  }}>
                  <Text style={styles.modalButtonText}>Edit Product</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {hasPermission('manager') && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProduct')}>
          <Text style={styles.addIcon}>➕</Text>
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No products found</Text>
            {hasPermission('manager') && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddProduct')}>
                <Text style={styles.emptyButtonText}>Add Your First Product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <ProductDetailModal />
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
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  productCalertIcon: {
    fontSize: 16,
    color: '#F44336',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
  normalStock: {
    color: '#4CAF50',
  },
  lowStock: {
    color: '#F44336',
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
  lowStockText: {
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

export default ProductsScreen;
