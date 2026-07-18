import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Picker,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../contexts/AuthContext';
import {useDatabase} from '../../contexts/DatabaseContext';
import SyncService from '../../services/SyncService';

const AddProductScreen = ({navigation, route}) => {
  const productId = route.params?.productId;
  const isEditing = !!productId;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    unit: 'pieces',
    purchasePrice: '',
    sellingPrice: '',
    taxRate: '0',
    stock: '0',
    minStock: '0',
    maxStock: '100',
    image: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const {shop} = useAuth();
  const {executeQuery} = useDatabase();

  useEffect(() => {
    loadCategories();
    if (isEditing) {
      loadProduct();
    }
  }, []);

  const loadCategories = async () => {
    try {
      const result = await executeQuery(
        'SELECT DISTINCT category FROM products WHERE shopId = ? AND category IS NOT NULL AND category != ""',
        [shop.id]
      );
      
      const categoryList = [];
      for (let i = 0; i < result.rows.length; i++) {
        categoryList.push(result.rows.item(i).category);
      }
      setCategories(categoryList);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      const result = await executeQuery(
        'SELECT * FROM products WHERE id = ? AND shopId = ?',
        [productId, shop.id]
      );
      
      if (result.rows.length > 0) {
        const product = result.rows.item(0);
        setFormData({
          name: product.name || '',
          description: product.description || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          category: product.category || '',
          brand: product.brand || '',
          unit: product.unit || 'pieces',
          purchasePrice: product.purchasePrice?.toString() || '',
          sellingPrice: product.sellingPrice?.toString() || '',
          taxRate: product.taxRate?.toString() || '0',
          stock: product.stock?.toString() || '0',
          minStock: product.minStock?.toString() || '0',
          maxStock: product.maxStock?.toString() || '100',
          image: product.image || '',
        });
      } else {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return false;
    }
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) < 0) {
      Alert.alert('Error', 'Valid purchase price is required');
      return false;
    }
    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) < 0) {
      Alert.alert('Error', 'Valid selling price is required');
      return false;
    }
    if (parseFloat(formData.sellingPrice) < parseFloat(formData.purchasePrice)) {
      Alert.alert('Error', 'Selling price cannot be less than purchase price');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category.trim(),
        brand: formData.brand.trim(),
        unit: formData.unit,
        purchasePrice: parseFloat(formData.purchasePrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        taxRate: parseFloat(formData.taxRate) || 0,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        maxStock: parseInt(formData.maxStock) || 100,
        image: formData.image,
        shopId: shop.id,
        updatedAt: new Date().toISOString(),
      };

      if (isEditing) {
        await executeQuery(`
          UPDATE products SET 
            name = ?, description = ?, sku = ?, barcode = ?, category = ?, brand = ?, 
            unit = ?, purchasePrice = ?, sellingPrice = ?, taxRate = ?, stock = ?, 
            minStock = ?, maxStock = ?, image = ?, updatedAt = ?
          WHERE id = ?
        `, [
          productData.name, productData.description, productData.sku, productData.barcode,
          productData.category, productData.brand, productData.unit, productData.purchasePrice,
          productData.sellingPrice, productData.taxRate, productData.stock, productData.minStock,
          productData.maxStock, productData.image, productData.updatedAt, productId
        ]);
        
        Alert.alert('Success', 'Product updated successfully');
      } else {
        const newProductId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        await executeQuery(`
          INSERT INTO products (
            id, name, description, sku, barcode, category, brand, unit, 
            purchasePrice, sellingPrice, taxRate, stock, minStock, maxStock, 
            image, shopId, isActive, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `, [
          newProductId, productData.name, productData.description, productData.sku,
          productData.barcode, productData.category, productData.brand, productData.unit,
          productData.purchasePrice, productData.sellingPrice, productData.taxRate,
          productData.stock, productData.minStock, productData.maxStock,
          productData.image, productData.shopId, new Date().toISOString(), productData.updatedAt
        ]);
        
        Alert.alert('Success', 'Product added successfully');
      }

      // Trigger background sync
      SyncService.forceSync().catch(err => console.log('Sync failed:', err));

      navigation.goBack();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const FormField = ({label, field, value, keyboardType = 'default', multiline = false}) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={(text) => handleInputChange(field, text)}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </Text>

        <FormField
          label="Product Name *"
          field="name"
          value={formData.name}
        />

        <FormField
          label="Description"
          field="description"
          value={formData.description}
          multiline={true}
        />

        <FormField
          label="SKU"
          field="sku"
          value={formData.sku}
        />

        <FormField
          label="Barcode"
          field="barcode"
          value={formData.barcode}
        />

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              style={styles.picker}>
              <Picker.Item label="Select Category" value="" />
              {categories.map((category, index) => (
                <Picker.Item key={index} label={category} value={category} />
              ))}
              <Picker.Item label="Add New Category" value="new" />
            </Picker>
          </View>
        </View>

        {formData.category === 'new' && (
          <FormField
            label="New Category Name"
            field="category"
            value={formData.category === 'new' ? '' : formData.category}
          />
        )}

        <FormField
          label="Brand"
          field="brand"
          value={formData.brand}
        />

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Unit</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.unit}
              onValueChange={(value) => handleInputChange('unit', value)}
              style={styles.picker}>
              <Picker.Item label="Pieces" value="pieces" />
              <Picker.Item label="Kilograms" value="kg" />
              <Picker.Item label="Liters" value="liters" />
              <Picker.Item label="Meters" value="meters" />
              <Picker.Item label="Boxes" value="boxes" />
              <Picker.Item label="Bottles" value="bottles" />
            </Picker>
          </View>
        </View>

        <FormField
          label="Purchase Price *"
          field="purchasePrice"
          value={formData.purchasePrice}
          keyboardType="numeric"
        />

        <FormField
          label="Selling Price *"
          field="sellingPrice"
          value={formData.sellingPrice}
          keyboardType="numeric"
        />

        <FormField
          label="Tax Rate (%)"
          field="taxRate"
          value={formData.taxRate}
          keyboardType="numeric"
        />

        <FormField
          label="Initial Stock"
          field="stock"
          value={formData.stock}
          keyboardType="numeric"
        />

        <FormField
          label="Minimum Stock Alert"
          field="minStock"
          value={formData.minStock}
          keyboardType="numeric"
        />

        <FormField
          label="Maximum Stock"
          field="maxStock"
          value={formData.maxStock}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {isEditing ? 'Update Product' : 'Add Product'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
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
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddProductScreen;
