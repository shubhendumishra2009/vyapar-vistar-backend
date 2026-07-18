import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {LineChart, BarChart, PieChart} from 'react-native-chart-kit';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';

const {width} = Dimensions.get('window');

const ReportsScreen = ({navigation}) => {
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [customerStats, setCustomerStats] = useState({});
  const [inventoryStats, setInventoryStats] = useState({});
  const [revenueStats, setRevenueStats] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  const {shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      
      const periodFilter = getPeriodFilter();
      
      const [salesResult, productsResult, customersResult, inventoryResult] = await Promise.all([
        executeQuery(`
          SELECT DATE(createdAt) as date, COUNT(*) as count, SUM(total) as revenue
          FROM transactions 
          WHERE shopId = ? AND type = 'sale' AND createdAt >= ?
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `, [shop.id, periodFilter]),
        
        executeQuery(`
          SELECT p.name, SUM(ti.quantity) as totalSold, SUM(ti.totalPrice) as totalRevenue
          FROM transactions t
          JOIN JSON_EACH(t.items) as item
          JOIN products p ON JSON_EXTRACT(item.value, '$.productId') = p.id
          WHERE t.shopId = ? AND t.type = 'sale' AND t.createdAt >= ?
          GROUP BY p.id
          ORDER BY totalSold DESC
          LIMIT 10
        `, [shop.id, periodFilter]),
        
        executeQuery(`
          SELECT 
            COUNT(*) as totalCustomers,
            COUNT(CASE WHEN isCreditCustomer = 1 THEN 1 END) as creditCustomers,
            SUM(CASE WHEN currentBalance > 0 THEN currentBalance ELSE 0 END) as totalOutstanding,
            AVG(currentBalance) as avgBalance
          FROM customers 
          WHERE shopId = ?
        `, [shop.id]),
        
        executeQuery(`
          SELECT 
            COUNT(*) as totalProducts,
            COUNT(CASE WHEN stock <= minStock THEN 1 END) as lowStock,
            COUNT(CASE WHEN stock = 0 THEN 1 END) as outOfStock,
            SUM(stock * purchasePrice) as totalValue
          FROM products 
          WHERE shopId = ? AND isActive = 1
        `, [shop.id])
      ]);

      const sales = [];
      for (let i = 0; i < salesResult.rows.length; i++) {
        sales.push(salesResult.rows.item(i));
      }
      setSalesData(sales);

      const products = [];
      for (let i = 0; i < productsResult.rows.length; i++) {
        products.push(productsResult.rows.item(i));
      }
      setTopProducts(products);

      if (customersResult.rows.length > 0) {
        setCustomerStats(customersResult.rows.item(0));
      }

      if (inventoryResult.rows.length > 0) {
        setInventoryStats(inventoryResult.rows.item(0));
      }

      const revenueData = {
        totalRevenue: sales.reduce((sum, sale) => sum + sale.revenue, 0),
        totalSales: sales.reduce((sum, sale) => sum + sale.count, 0),
        avgSaleValue: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.revenue, 0) / sales.length : 0,
      };
      setRevenueStats(revenueData);

    } catch (error) {
      console.error('Error loading report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodFilter = () => {
    const now = new Date();
    let filterDate;
    
    switch (selectedPeriod) {
      case 'week':
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        filterDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        filterDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return filterDate.toISOString();
  };

  const getSalesChartData = () => {
    return {
      labels: salesData.map(sale => {
        const date = new Date(sale.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [{
        data: salesData.map(sale => sale.revenue),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  const getTopProductsChartData = () => {
    return {
      labels: topProducts.slice(0, 5).map(product => 
        product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name
      ),
      datasets: [{
        data: topProducts.slice(0, 5).map(product => product.totalSold)
      }]
    };
  };

  const getInventoryPieData = () => {
    const inStock = inventoryStats.totalProducts - inventoryStats.lowStock - inventoryStats.outOfStock;
    return [
      {
        name: 'In Stock',
        population: inStock,
        color: '#4CAF50',
        legendFontColor: '#333',
        legendFontSize: 12
      },
      {
        name: 'Low Stock',
        population: inventoryStats.lowStock,
        color: '#FF9800',
        legendFontColor: '#333',
        legendFontSize: 12
      },
      {
        name: 'Out of Stock',
        population: inventoryStats.outOfStock,
        color: '#F44336',
        legendFontColor: '#333',
        legendFontSize: 12
      }
    ];
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <View style={styles.periodSelector}>
          {['week', 'month', 'quarter', 'year'].map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.activePeriod
              ]}
              onPress={() => setSelectedPeriod(period)}>
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.activePeriodText
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.summaryCards}>
        <View style={styles.summaryCard}>
          <Icon name="currency-inr" size={24} color="#4CAF50" />
          <Text style={styles.summaryValue}>₹{revenueStats.totalRevenue?.toFixed(0) || '0'}</Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </View>
        
        <View style={styles.summaryCard}>
          {/* <Icon name="receipt-text-outline" size={24} color="#2196F3" /> */}
          <Text style={styles.summaryValue}>{revenueStats.totalSales || 0}</Text>
          <Text style={styles.summaryLabel}>Total Sales</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Icon name="trending-up" size={24} color="#FF9800" />
          <Text style={styles.summaryValue}>₹{revenueStats.avgSaleValue?.toFixed(0) || '0'}</Text>
          <Text style={styles.summaryLabel}>Avg Sale Value</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Icon name="account-cash" size={24} color="#9C27B0" />
          <Text style={styles.summaryValue}>₹{customerStats.totalOutstanding?.toFixed(0) || '0'}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Sales Trend</Text>
        {salesData.length > 0 ? (
          <LineChart
            data={getSalesChartData()}
            width={width - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#2196F3'
              }
            }}
            bezier
            style={styles.chart}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No sales data available</Text>
          </View>
        )}
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Top Selling Products</Text>
        {topProducts.length > 0 ? (
          <BarChart
            data={getTopProductsChartData()}
            width={width - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              }
            }}
            style={styles.chart}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No product data available</Text>
          </View>
        )}
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Inventory Status</Text>
        {inventoryStats.totalProducts > 0 ? (
          <PieChart
            data={getInventoryPieData()}
            width={width - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No inventory data available</Text>
          </View>
        )}
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Customer Statistics</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Customers:</Text>
          <Text style={styles.statValue}>{customerStats.totalCustomers || 0}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Credit Customers:</Text>
          <Text style={styles.statValue}>{customerStats.creditCustomers || 0}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Outstanding:</Text>
          <Text style={styles.statValue}>₹{customerStats.totalOutstanding?.toFixed(2) || '0'}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Average Balance:</Text>
          <Text style={styles.statValue}>₹{customerStats.avgBalance?.toFixed(2) || '0'}</Text>
        </View>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Inventory Statistics</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Products:</Text>
          <Text style={styles.statValue}>{inventoryStats.totalProducts || 0}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Low Stock Items:</Text>
          <Text style={styles.statValue}>{inventoryStats.lowStock || 0}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Out of Stock:</Text>
          <Text style={styles.statValue}>{inventoryStats.outOfStock || 0}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Inventory Value:</Text>
          <Text style={styles.statValue}>₹{inventoryStats.totalValue?.toFixed(2) || '0'}</Text>
        </View>
      </View>

      <View style={styles.exportSection}>
        <TouchableOpacity style={styles.exportButton}>
          <Icon name="download" size={20} color="white" />
          <Text style={styles.exportButtonText}>Export Report</Text>
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
  header: {
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
    marginBottom: 15,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activePeriod: {
    backgroundColor: '#2196F3',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activePeriodText: {
    color: 'white',
    fontWeight: 'bold',
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  summaryCard: {
    width: (width - 40) / 2,
    backgroundColor: 'white',
    padding: 20,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chartSection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 10,
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  statsSection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  exportSection: {
    padding: 20,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ReportsScreen;
