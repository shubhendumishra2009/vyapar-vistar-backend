import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';

const SaleDetailScreen = ({navigation, route}) => {
  const {saleId} = route.params;
  const [sale, setSale] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const {shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadSaleDetails();
  }, []);

  const loadSaleDetails = async () => {
    try {
      setIsLoading(true);
      
      const [saleResult, customerResult] = await Promise.all([
        executeQuery('SELECT * FROM transactions WHERE id = ? AND shopId = ?', [saleId, shop.id]),
        executeQuery('SELECT * FROM customers WHERE id = (SELECT customerId FROM transactions WHERE id = ?)', [saleId])
      ]);

      if (saleResult.rows.length > 0) {
        const saleData = saleResult.rows.item(0);
        setSale(saleData);
        
        const itemsData = JSON.parse(saleData.items || '[]');
        setItems(itemsData);
        
        if (customerResult.rows.length > 0) {
          setCustomer(customerResult.rows.item(0));
        }
      } else {
        Alert.alert('Error', 'Sale not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading sale details:', error);
      Alert.alert('Error', 'Failed to load sale details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      const invoiceText = generateInvoiceText();
      
      await Share.share({
        message: invoiceText,
        title: `Invoice ${sale.invoiceNumber}`,
      });
    } catch (error) {
      console.error('Error sharing invoice:', error);
      Alert.alert('Error', 'Failed to share invoice');
    }
  };

  const generateInvoiceText = () => {
    const itemsText = items.map(item => 
      `${item.name}\n  ${item.quantity} x ₹${item.unitPrice.toFixed(2)} = ₹${item.totalPrice.toFixed(2)}`
    ).join('\n');

    return `
INVOICE
${shop.name}
${shop.address || ''}
${shop.phone || ''}

Invoice #: ${sale.invoiceNumber}
Date: ${new Date(sale.createdAt).toLocaleDateString()}
Customer: ${customer?.name || 'Walk-in Customer'}
${customer?.phone ? `Phone: ${customer.phone}` : ''}

ITEMS:
${itemsText}

Subtotal: ₹${sale.subtotal.toFixed(2)}
${sale.tax > 0 ? `Tax: ₹${sale.tax.toFixed(2)}` : ''}
${sale.discount > 0 ? `Discount: ₹${sale.discount.toFixed(2)}` : ''}
TOTAL: ₹${sale.total.toFixed(2)}

Payment Method: ${sale.paymentMethod}
Payment Status: ${sale.paymentStatus}

${sale.notes ? `Notes: ${sale.notes}` : ''}

Thank you for your business!
    `.trim();
  };

  const handleMarkAsPaid = async () => {
    if (sale.paymentStatus === 'paid') {
      Alert.alert('Info', 'This sale is already marked as paid');
      return;
    }

    try {
      await executeQuery(
        'UPDATE transactions SET paymentStatus = ?, updatedAt = ? WHERE id = ?',
        ['paid', new Date().toISOString(), saleId]
      );

      if (customer) {
        const newBalance = customer.currentBalance - sale.total;
        await executeQuery(
          'UPDATE customers SET currentBalance = ?, updatedAt = ? WHERE id = ?',
          [newBalance, new Date().toISOString(), customer.id]
        );
      }

      loadSaleDetails();
      Alert.alert('Success', 'Sale marked as paid');
    } catch (error) {
      console.error('Error marking sale as paid:', error);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Sale',
      `Are you sure you want to delete this sale? This action cannot be undone and will restore the stock.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const item of items) {
                const productResult = await executeQuery(
                  'SELECT stock FROM products WHERE id = ?',
                  [item.productId]
                );
                
                if (productResult.rows.length > 0) {
                  const currentStock = productResult.rows.item(0).stock;
                  const newStock = currentStock + item.quantity;
                  
                  await executeQuery(
                    'UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?',
                    [newStock, new Date().toISOString(), item.productId]
                  );

                  await executeQuery(`
                    INSERT INTO inventory_logs (
                      id, productId, transactionId, type, quantity, previousStock, newStock, reason, createdAt, shopId
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    Date.now().toString(36) + Math.random().toString(36).substr(2),
                    item.productId,
                    saleId,
                    'sale_deleted',
                    item.quantity,
                    currentStock,
                    newStock,
                    `Sale deleted: ${sale.invoiceNumber}`,
                    new Date().toISOString(),
                    shop.id
                  ]);
                }
              }

              if (customer && sale.paymentStatus === 'pending') {
                const newBalance = customer.currentBalance - sale.total;
                await executeQuery(
                  'UPDATE customers SET currentBalance = ?, updatedAt = ? WHERE id = ?',
                  [newBalance, new Date().toISOString(), customer.id]
                );
              }

              await executeQuery('DELETE FROM transactions WHERE id = ?', [saleId]);
              
              Alert.alert('Success', 'Sale deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting sale:', error);
              Alert.alert('Error', 'Failed to delete sale');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Sale not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.invoiceNumber}>{sale.invoiceNumber}</Text>
          <Text style={styles.saleDate}>
            {new Date(sale.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
            <Icon name="share" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('NewSale', {duplicateSale: sale})}>
            <Icon name="content-copy" size={20} color="#FF9800" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        {customer ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{customer.name}</Text>
            </View>
            {customer.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{customer.phone}</Text>
              </View>
            )}
            {customer.isCreditCustomer && (
              <View style={styles.row}>
                <Text style={styles.label}>Type:</Text>
                <Text style={styles.value}>Credit Customer</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.row}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>Walk-in Customer</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Information</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Payment Method:</Text>
          <Text style={styles.value}>{sale.paymentMethod}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Payment Status:</Text>
          <Text style={[
            styles.value,
            {color: sale.paymentStatus === 'paid' ? '#4CAF50' : '#FF9800'}
          ]}>
            {sale.paymentStatus}
          </Text>
        </View>
        
        {sale.paymentStatus === 'pending' && (
          <TouchableOpacity
            style={styles.markPaidButton}
            onPress={handleMarkAsPaid}>
            <Icon name="cash-check" size={20} color="white" />
            <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetails}>
                {item.quantity} x ₹{item.unitPrice.toFixed(2)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>₹{item.totalPrice.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>₹{sale.subtotal.toFixed(2)}</Text>
        </View>
        
        {sale.tax > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax:</Text>
            <Text style={styles.summaryValue}>₹{sale.tax.toFixed(2)}</Text>
          </View>
        )}
        
        {sale.discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount:</Text>
            <Text style={styles.summaryValue}>-₹{sale.discount.toFixed(2)}</Text>
          </View>
        )}
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>₹{sale.total.toFixed(2)}</Text>
        </View>
      </View>

      {sale.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{sale.notes}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('NewSale', {duplicateSale: sale})}>
          <Icon name="content-copy" size={20} color="white" />
          <Text style={styles.actionButtonText}>Duplicate Sale</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handlePrint}>
          <Icon name="share" size={20} color="white" />
          <Text style={styles.actionButtonText}>Share Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleDelete}>
          <Icon name="delete" size={20} color="white" />
          <Text style={styles.actionButtonText}>Delete Sale</Text>
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
  invoiceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  saleDate: {
    fontSize: 16,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 10,
    marginLeft: 10,
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
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  markPaidButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  actions: {
    padding: 20,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
  },
  dangerButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default SaleDetailScreen;
