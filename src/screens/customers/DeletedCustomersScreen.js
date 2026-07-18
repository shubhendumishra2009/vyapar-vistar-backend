import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SyncService from '../../services/SyncService';

const DeletedCustomersScreen = ({ navigation }) => {
  const [deletedCustomers, setDeletedCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeletedCustomers();
  }, []);

  const loadDeletedCustomers = async () => {
    try {
      setIsLoading(true);
      const customers = await SyncService.getDeletedCustomers();
      setDeletedCustomers(customers);
    } catch (error) {
      console.error('Error loading deleted customers:', error);
      Alert.alert('Error', 'Failed to load deleted customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDeletedCustomers();
    setRefreshing(false);
  };

  const handleRestoreCustomer = (customer) => {
    Alert.alert(
      'Restore Customer',
      `Are you sure you want to restore ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'default',
          onPress: async () => {
            try {
              await SyncService.restoreCustomer(customer.id);
              Alert.alert('Success', 'Customer restored successfully');
              loadDeletedCustomers(); // Refresh the list
            } catch (error) {
              console.error('Error restoring customer:', error);
              Alert.alert('Error', 'Failed to restore customer');
            }
          },
        },
      ]
    );
  };

  const renderCustomer = ({ item }) => (
    <View style={styles.customerItem}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name || 'Unknown'}</Text>
        <Text style={styles.customerPhone}>{item.phone || 'No phone'}</Text>
        <Text style={styles.customerEmail}>{item.email || 'No email'}</Text>
        <Text style={styles.deletedDate}>
          Deleted: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Unknown date'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={() => handleRestoreCustomer(item)}
      >
        <Icon name="restore" size={20} color="#fff" />
        <Text style={styles.restoreButtonText}>Restore</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading deleted customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deleted Customers</Text>
      </View>

      {deletedCustomers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="trash-can-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No deleted customers found</Text>
        </View>
      ) : (
        <FlatList
          data={deletedCustomers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  customerItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deletedDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  restoreButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  restoreButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DeletedCustomersScreen;
