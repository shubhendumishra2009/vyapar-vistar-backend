import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';
import SyncService from '../../services/SyncService';

const NewSaleScreen = ({navigation, route}) => {
  const {selectedProduct, selectedCustomer, duplicateSale} = route.params || {};
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [discount, setDiscount] = useState('0');
  
  const {shop, user} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadProducts();
    loadCustomers();
    
    if (selectedProduct) {
      addToCart(selectedProduct);
    }
    
    if (selectedCustomer) {
      setSelectedCustomerObj(selectedCustomer);
    }
    
    if (duplicateSale) {
      duplicateSaleData();
    }
  }, []);

  const loadProducts = async () => {
    try {
      const result = await executeQuery(`
        SELECT * FROM products 
        WHERE shopId = ? AND isActive = 1 AND stock > 0
        ORDER BY name ASC
      `, [shop.id]);
      
      const productList = [];
      for (let i = 0; i < result.rows.length; i++) {
        productList.push(result.rows.item(i));
      }
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const result = await executeQuery(`
        SELECT * FROM customers 
        WHERE shopId = ? AND (isDeleted IS NULL OR isDeleted = 0)
        ORDER BY name ASC
      `, [shop.id]);
      
      const customerList = [];
      for (let i = 0; i < result.rows.length; i++) {
        customerList.push(result.rows.item(i));
      }
      setCustomers(customerList);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const duplicateSaleData = () => {
    if (duplicateSale) {
      const items = JSON.parse(duplicateSale.items || '[]');
      const duplicatedItems = items.map(item => ({
        ...item,
        quantity: 1,
        totalPrice: item.unitPrice
      }));
      setCartItems(duplicatedItems);
      setPaymentMethod(duplicateSale.paymentMethod);
      setNotes(duplicateSale.notes || '');
    }
  };

  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCartItems(cartItems.map(item =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * item.unitPrice
              }
            : item
        ));
      } else {
        Alert.alert('Stock Limit', `Only ${product.stock} units available in stock`);
      }
    } else {
      setCartItems([...cartItems, {
        id: product.id,
        name: product.name,
        unitPrice: product.sellingPrice,
        quantity: 1,
        totalPrice: product.sellingPrice,
        taxRate: product.taxRate,
        stock: product.stock
      }]);
    }
    setShowProductModal(false);
  };

  const updateCartItem = (itemId, field, value) => {
    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;

    let newValue = parseInt(value) || 0;
    
    if (field === 'quantity') {
      if (newValue < 0) newValue = 0;
      if (newValue > item.stock) {
        Alert.alert('Stock Limit', `Only ${item.stock} units available`);
        return;
      }
    }

    setCartItems(cartItems.map(cartItem => {
      if (cartItem.id === itemId) {
        const updatedItem = {
          ...cartItem,
          [field]: field === 'quantity' ? newValue : parseFloat(value) || 0
        };
        
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        
        return updatedItem;
      }
      return cartItem;
    }));
  };

  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const discountAmount = parseFloat(discount) || 0;
    const tax = cartItems.reduce((sum, item) => {
      const itemTax = (item.totalPrice * (item.taxRate || 0)) / 100;
      return sum + itemTax;
    }, 0);
    const total = subtotal - discountAmount + tax;
    
    return {subtotal, discountAmount, tax, total};
  };

  const generateInvoiceNumber = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    const timeStr = Date.now().toString().slice(-4);
    return `INV-${dateStr}-${timeStr}`;
  };

  const completeSale = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item to the cart');
      return;
    }

    if (!selectedCustomerObj && paymentMethod === 'credit') {
      Alert.alert('Error', 'Please select a customer for credit sales');
      return;
    }

    try {
      setIsLoading(true);
      
      const {subtotal, discountAmount, tax, total} = calculateTotals();
      const invoiceNumber = generateInvoiceNumber();
      
      const saleId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      const itemsData = cartItems.map(item => ({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        discount: 0,
        tax: (item.totalPrice * (item.taxRate || 0)) / 100
      }));

      await executeQuery(`
        INSERT INTO transactions (
          id, type, invoiceNumber, customerId, userId, shopId, items,
          subtotal, tax, discount, total, paymentMethod, paymentStatus,
          notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        saleId,
        'sale',
        invoiceNumber,
        selectedCustomerObj?.id || null,
        user.id,
        shop.id,
        JSON.stringify(itemsData),
        subtotal,
        tax,
        discountAmount,
        total,
        paymentMethod,
        paymentMethod === 'credit' ? 'pending' : 'paid',
        notes,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      for (const item of cartItems) {
        const newStock = item.stock - item.quantity;
        
        await executeQuery(
          'UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?',
          [newStock, new Date().toISOString(), item.id]
        );

        await executeQuery(`
          INSERT INTO inventory_logs (
            id, productId, transactionId, type, quantity, previousStock, newStock, reason, createdAt, shopId
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          Date.now().toString(36) + Math.random().toString(36).substr(2),
          item.id,
          saleId,
          'sale',
          -item.quantity,
          item.stock,
          newStock,
          `Sale: ${invoiceNumber}`,
          new Date().toISOString(),
          shop.id
        ]);
      }

      if (selectedCustomerObj && paymentMethod === 'credit') {
        const newBalance = selectedCustomerObj.currentBalance + total;
        await executeQuery(
          'UPDATE customers SET currentBalance = ?, updatedAt = ? WHERE id = ?',
          [newBalance, new Date().toISOString(), selectedCustomerObj.id]
        );
      }

      Alert.alert('Success', `Sale completed successfully!\nInvoice: ${invoiceNumber}`, [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Sales');
          }
        }
      ]);

      // Trigger background sync
      SyncService.forceSync().catch(err => console.log('Sync failed:', err));

    } catch (error) {
      console.error('Error completing sale:', error);
      Alert.alert('Error', 'Failed to complete sale');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCartItem = ({item}) => (
    <View style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}>
          <Icon name="close" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartItem(item.id, 'quantity', item.quantity - 1)}>
            <Icon name="minus" size={16} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.quantityInput}
            value={item.quantity.toString()}
            onChangeText={(text) => updateCartItem(item.id, 'quantity', text)}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartItem(item.id, 'quantity', item.quantity + 1)}>
            <Icon name="plus" size={16} color="#666" />
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.priceInput}
          value={item.unitPrice.toString()}
          onChangeText={(text) => updateCartItem(item.id, 'unitPrice', text)}
          keyboardType="numeric"
        />
        
        <Text style={styles.itemTotal}>₹{item.totalPrice.toFixed(2)}</Text>
      </View>
      
      <Text style={styles.stockInfo}>Stock: {item.stock - item.quantity} available</Text>
    </View>
  );

  const renderProductItem = ({item}) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => addToCart(item)}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>₹{item.sellingPrice}</Text>
      <Text style={styles.productStock}>Stock: {item.stock}</Text>
    </TouchableOpacity>
  );

  const renderCustomerItem = ({item}) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => {
        setSelectedCustomerObj(item);
        setShowCustomerModal(false);
      }}>
      <Text style={styles.customerName}>{item.name}</Text>
      <Text style={styles.customerPhone}>{item.phone}</Text>
      {item.isCreditCustomer && (
        <Text style={styles.customerType}>Credit Customer</Text>
      )}
    </TouchableOpacity>
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.includes(customerSearch)
  );

  const {subtotal, discountAmount, tax, total} = calculateTotals();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Sale</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.customerSelector}
            onPress={() => setShowCustomerModal(true)}>
            <Icon name="account" size={20} color="#666" />
            <Text style={styles.customerText}>
              {selectedCustomerObj ? selectedCustomerObj.name : 'Select Customer (Optional)'}
            </Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowProductModal(true)}>
            <Icon name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Products</Text>
          </TouchableOpacity>
        </View>

        {cartItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cart Items</Text>
            <FlatList
              data={cartItems}
              renderItem={renderCartItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <View style={styles.paymentMethods}>
            {['cash', 'card', 'upi', 'credit'].map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentMethod,
                  paymentMethod === method && styles.selectedPaymentMethod
                ]}
                onPress={() => setPaymentMethod(method)}>
                <Icon
                  name={
                    method === 'cash' ? 'cash' :
                    method === 'card' ? 'credit-card' :
                    method === 'upi' ? 'cellphone' :
                    'account-clock'
                  }
                  size={20}
                  color={paymentMethod === method ? 'white' : '#666'}
                />
                <Text style={[
                  styles.paymentMethodText,
                  paymentMethod === method && styles.selectedPaymentMethodText
                ]}>
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.discountRow}>
            <Text style={styles.label}>Discount:</Text>
            <TextInput
              style={styles.discountInput}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>

          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes (optional)"
            multiline
          />
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount:</Text>
              <Text style={styles.summaryValue}>-₹{discountAmount.toFixed(2)}</Text>
            </View>
          )}
          {tax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax:</Text>
              <Text style={styles.summaryValue}>₹{tax.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={completeSale}
          disabled={cartItems.length === 0}>
          <Text style={styles.completeButtonText}>Complete Sale</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={false}
        visible={showProductModal}
        onRequestClose={() => setShowProductModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Products</Text>
            <View style={{width: 24}} />
          </View>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={productSearch}
            onChangeText={setProductSearch}
          />
          
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No products found</Text>
            }
          />
        </View>
      </Modal>

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
          
          <TouchableOpacity
            style={styles.walkInButton}
            onPress={() => {
              setSelectedCustomerObj(null);
              setShowCustomerModal(false);
            }}>
            <Icon name="walk" size={20} color="#666" />
            <Text style={styles.walkInText}>Walk-in Customer</Text>
          </TouchableOpacity>
          
          <FlatList
            data={filteredCustomers}
            renderItem={renderCustomerItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No customers found</Text>
            }
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 20,
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
  content: {
    flex: 1,
    padding: 10,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  customerText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  cartItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeButton: {
    padding: 5,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quantityButton: {
    padding: 8,
  },
  quantityInput: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceInput: {
    width: 80,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    width: 80,
    textAlign: 'right',
  },
  stockInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedPaymentMethod: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  selectedPaymentMethodText: {
    color: 'white',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summary: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
  searchInput: {
    margin: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginHorizontal: 10,
  },
  productStock: {
    fontSize: 14,
    color: '#666',
  },
  walkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    margin: 15,
    borderRadius: 8,
  },
  walkInText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  customerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  customerType: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default NewSaleScreen;
