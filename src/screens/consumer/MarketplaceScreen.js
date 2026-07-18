import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import APIService from '../../services/APIService';
import {useAuth} from '../../contexts/AuthContext';

const MarketplaceScreen = ({navigation}) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const {logout, user} = useAuth();

  useEffect(() => {
    fetchGlobalProducts();
  }, []);

  const fetchGlobalProducts = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would be a global search endpoint
      // For now, we fetch all products available in the system
      const response = await APIService.request('GET', '/products');
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error fetching marketplace:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProductItem = ({item}) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={styles.imagePlaceholder}>
        <Icon name="package-variant" size={40} color="#ccc" />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.shopName}>Sold by: {item.shopId?.name || 'Local Shop'}</Text>
        <Text style={styles.price}>₹{item.sellingPrice}</Text>
      </View>
      <TouchableOpacity style={styles.addButton}>
        <Icon name="cart-plus" size={20} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, {user?.name}</Text>
          <Text style={styles.locationText}>
            <Icon name="map-marker" size={14} color="#2196F3" /> Mumbai, India
          </Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Icon name="logout" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products or shops..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <Text style={styles.sectionTitle}>Products Near You</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => item._id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="store-search" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No products found nearby</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  locationText: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 20,
    marginTop: 0,
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 15,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 10,
  },
  productCard: {
    flex: 1,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  shopName: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 8,
  },
  addButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#2196F3',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
});

export default MarketplaceScreen;
