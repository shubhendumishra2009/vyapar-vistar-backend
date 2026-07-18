import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';

const ProductDetailScreen = ({navigation, route}) => {
  const {productId} = route.params;
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  
  const {hasPermission, shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadProductDetails();
  }, []);

  const loadProductDetails = async () => {
    try {
      setIsLoading(true);
      
      const [productResult, logsResult] = await Promise.all([
        executeQuery('SELECT * FROM products WHERE id = ? AND shopId = ?', [productId, shop.id]),
        executeQuery(`
          SELECT il.*, p.name as productName 
          FROM inventory_logs il
          JOIN products p ON il.productId = p.id
          WHERE il.productId = ? AND il.shopId = ?
          ORDER BY il.createdAt DESC
          LIMIT 20
        `, [productId, shop.id])
      ]);

      if (productResult.rows.length > 0) {
        setProduct(productResult.rows.item(0));
        
        const logs = [];
        for (let i = 0; i < logsResult.rows.length; i++) {
          logs.push(logsResult.rows.item(i));
        }
        setInventoryLogs(logs);
      } else {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading product details:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await executeQuery(
                'UPDATE products SET isActive = 0 WHERE id = ?',
                [productId]
              );
              Alert.alert('Success', 'Product deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleAddToSale = () => {
    navigation.navigate('NewSale', {selectedProduct: product});
  };

  const getStockStatus = () => {
    if (!product) return {status: 'Unknown', color: '#666'};
    
    if (product.stock === 0) {
      return {status: 'Out of Stock', color: '#F44336'};
    } else if (product.stock <= product.minStock) {
      return {status: 'Low Stock', color: '#FF9800'};
    } else if (product.stock >= product.maxStock) {
      return {status: 'Overstocked', color: '#9C27B0'};
    } else {
      return {status: 'In Stock', color: '#4CAF50'};
    }
  };

  const calculateProfit = () => {
    if (!product) return 0;
    return product.sellingPrice - product.purchasePrice;
  };

  const calculateProfitMargin = () => {
    if (!product || product.sellingPrice === 0) return 0;
    return ((calculateProfit() / product.sellingPrice) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {product.image ? (
          <Image source={{uri: product.image}} style={styles.productImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="package-variant" size={64} color="#ccc" />
          </View>
        )}
        
        <View style={styles.headerInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productSku}>{product.sku || 'No SKU'}</Text>
          <View style={styles.stockContainer}>
            <Text style={styles.stockLabel}>Stock:</Text>
            <Text style={[styles.stockValue, {color: stockStatus.color}]}>
              {product.stock} {product.unit}
            </Text>
            <Text style={[styles.stockStatus, {color: stockStatus.color}]}>
              ({stockStatus.status})
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing Information</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Purchase Price:</Text>
          <Text style={styles.value}>₹{product.purchasePrice.toFixed(2)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Selling Price:</Text>
          <Text style={styles.value}>₹{product.sellingPrice.toFixed(2)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Profit per Unit:</Text>
          <Text style={[styles.value, styles.profit]}>
            ₹{calculateProfit().toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Profit Margin:</Text>
          <Text style={[styles.value, styles.profit]}>
            {calculateProfitMargin()}%
          </Text>
        </View>
        
        {product.taxRate > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Tax Rate:</Text>
            <Text style={styles.value}>{product.taxRate}%</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Details</Text>
        
        {product.description && (
          <View style={styles.row}>
            <Text style={styles.label}>Description:</Text>
            <Text style={styles.value}>{product.description}</Text>
          </View>
        )}
        
        {product.category && (
          <View style={styles.row}>
            <Text style={styles.label}>Category:</Text>
            <Text style={styles.value}>{product.category}</Text>
          </View>
        )}
        
        {product.brand && (
          <View style={styles.row}>
            <Text style={styles.label}>Brand:</Text>
            <Text style={styles.value}>{product.brand}</Text>
          </View>
        )}
        
        <View style={styles.row}>
          <Text style={styles.label}>Unit:</Text>
          <Text style={styles.value}>{product.unit}</Text>
        </View>
        
        {product.barcode && (
          <View style={styles.row}>
            <Text style={styles.label}>Barcode:</Text>
            <Text style={styles.value}>{product.barcode}</Text>
          </View>
        )}
        
        <View style={styles.row}>
          <Text style={styles.label}>Min Stock Alert:</Text>
          <Text style={styles.value}>{product.minStock} {product.unit}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Max Stock:</Text>
          <Text style={styles.value}>{product.maxStock} {product.unit}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Inventory Changes</Text>
        
        {inventoryLogs.length > 0 ? (
          inventoryLogs.map((log, index) => (
            <View key={index} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.logType}>{log.type.toUpperCase()}</Text>
                <Text style={styles.logDate}>
                  {new Date(log.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.logQuantity}>
                {log.quantity > 0 ? '+' : ''}{log.quantity} {product.unit}
              </Text>
              <Text style={styles.logStock}>
                {log.previousStock} → {log.newStock} {product.unit}
              </Text>
              {log.reason && (
                <Text style={styles.logReason}>{log.reason}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No inventory changes recorded</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleAddToSale}>
          <Icon name="cart-plus" size={20} color="white" />
          <Text style={styles.actionButtonText}>Add to Sale</Text>
        </TouchableOpacity>

        {hasPermission('manager') && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('AddProduct', {productId})}>
              <Icon name="pencil" size={20} color="white" />
              <Text style={styles.actionButtonText}>Edit Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDelete}>
              <Icon name="delete" size={20} color="white" />
              <Text style={styles.actionButtonText}>Delete Product</Text>
            </TouchableOpacity>
          </>
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
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 20,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productSku: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  stockStatus: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  section: {
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
  },
  profit: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  logItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  logType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  logDate: {
    fontSize: 12,
    color: '#666',
  },
  logQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  logStock: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logReason: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
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
  secondaryButton: {
    backgroundColor: '#2196F3',
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

export default ProductDetailScreen;
