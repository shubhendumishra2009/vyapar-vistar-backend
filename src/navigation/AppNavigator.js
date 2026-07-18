import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../contexts/AuthContext';

import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProductsScreen from '../screens/products/ProductsScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import AddProductScreen from '../screens/products/AddProductScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import AddCustomerScreen from '../screens/customers/AddCustomerScreen';
import DeletedCustomersScreen from '../screens/customers/DeletedCustomersScreen';
import SalesScreen from '../screens/sales/SalesScreen';
import SaleDetailScreen from '../screens/sales/SaleDetailScreen';
import NewSaleScreen from '../screens/sales/NewSaleScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SMSScreen from '../screens/sms/SMSScreen';
import MarketplaceScreen from '../screens/consumer/MarketplaceScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Conditional screen components for access control
const RestrictedProductsScreen = () => {
  const { shop } = useAuth();
  
  React.useEffect(() => {
    if (!shop || !shop.isLocked) {
      Alert.alert(
        'Access Denied',
        'Please select and lock a shop to access Products.',
        [{text: 'OK'}]
      );
    }
  }, [shop]);

  if (!shop || !shop.isLocked) {
    return (
      <View style={styles.restrictedContainer}>
        <Icon name="lock" size={48} color="#ccc" />
        <Text style={styles.restrictedText}>Access Restricted</Text>
        <Text style={styles.restrictedSubText}>Please select and lock a shop to access this feature.</Text>
      </View>
    );
  }

  return <ProductsScreen />;
};

const RestrictedCustomersScreen = () => {
  const { shop } = useAuth();
  
  React.useEffect(() => {
    if (!shop || !shop.isLocked) {
      Alert.alert(
        'Access Denied',
        'Please select and lock a shop to access Customers.',
        [{text: 'OK'}]
      );
    }
  }, [shop]);

  if (!shop || !shop.isLocked) {
    return (
      <View style={styles.restrictedContainer}>
        <Icon name="lock" size={48} color="#ccc" />
        <Text style={styles.restrictedText}>Access Restricted</Text>
        <Text style={styles.restrictedSubText}>Please select and lock a shop to access this feature.</Text>
      </View>
    );
  }

  return <CustomersScreen />;
};

const MainTabs = () => {
  const { shop } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconEmoji;

          switch (route.name) {
            case 'Dashboard':
              iconEmoji = focused ? '📊' : '📊';
              break;
            case 'Sales':
              iconEmoji = focused ? '💰' : '💰';
              break;
            case 'Products':
              iconEmoji = focused ? '📦' : '📦';
              break;
            case 'Customers':
              iconEmoji = focused ? '👥' : '👥';
              break;
            case 'More':
              iconEmoji = focused ? '⋮' : '⋮';
              break;
            default:
              iconEmoji = '❓';
          }

          return <Text style={{fontSize: size, color: color}}>{iconEmoji}</Text>;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
        },
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'VyaparVistar',
          headerShown: false
        }}
      />
      <Tab.Screen
        name="Products"
        component={RestrictedProductsScreen}
        options={{title: 'Products'}}
      />
      <Tab.Screen
        name="Customers"
        component={RestrictedCustomersScreen}
        options={{title: 'Customers'}}
      />
      <Tab.Screen name="Sales" component={NewSaleScreen} options={{title: 'Sales'}} />
      <Tab.Screen name="More" component={MoreStack} options={{title: 'More'}} />
    </Tab.Navigator>
  );
};

const MoreStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MoreMain" component={MoreScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="SMS" component={SMSScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

const MoreScreen = ({navigation}) => {
  const { shop } = useAuth();
  
  const menuItems = [
    {title: 'Inventory Management', icon: 'warehouse', screen: 'Inventory'},
    {title: 'Reports & Analytics', icon: 'chart-line', screen: 'Reports'},
    {title: 'SMS & Notifications', icon: 'message-text', screen: 'SMS'},
    {title: 'Settings', icon: 'cog', screen: 'Settings'},
  ];

  const handleMenuPress = (item) => {
    // Only allow access if shop exists and is locked
    if (!shop || !shop.isLocked) {
      console.log('❌ Access denied: No shop selected or shop not locked');
      // Show alert to user
      Alert.alert(
        'Access Denied',
        'Please select and lock a shop to access this feature.',
        [{text: 'OK'}]
      );
      return;
    }
    
    navigation.navigate(item.screen);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleMenuPress(item)}>
            <Icon name={item.icon} size={24} color="#2196F3" />
            <Text style={styles.menuText}>{item.title}</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  restrictedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  restrictedSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

const AppNavigator = () => {
  const {isAuthenticated, isLoading, user} = useAuth();

  if (isLoading) {
    return (
      <View style={loadingStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {isAuthenticated ? (
        user?.type === 'consumer' ? (
          <Stack.Screen name="ConsumerMain" component={MarketplaceScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="AddProduct" component={AddProductScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
            <Stack.Screen name="DeletedCustomers" component={DeletedCustomersScreen} />
            <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
            <Stack.Screen name="NewSale" component={NewSaleScreen} />
          </>
        )
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

const loadingStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default AppNavigator;
