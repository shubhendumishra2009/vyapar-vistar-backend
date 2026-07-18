import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useAuth} from '../../contexts/AuthContext';

const LoginScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [userType, setUserType] = useState('consumer'); // 'admin' or 'consumer'

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const {login, register} = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim() || !name.trim() || !email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const userData = {
        username,
        password,
        name,
        email,
        phone,
        type: userType
      };

      const result = await register(userData);
      if (!result.success) {
        Alert.alert('Registration Failed', result.error);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Vyapar Vistar</Text>
          <Text style={styles.subtitleText}>Grow Your Business Anywhere</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, !isRegistering && styles.activeTab]}
              onPress={() => setIsRegistering(false)}
            >
              <Text style={[styles.tabText, !isRegistering && styles.activeTabText]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, isRegistering && styles.activeTab]}
              onPress={() => setIsRegistering(true)}
            >
              <Text style={[styles.tabText, isRegistering && styles.activeTabText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {isRegistering && (
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[styles.typeButton, userType === 'consumer' && styles.activeType]}
                onPress={() => setUserType('consumer')}
              >
                <Text style={[styles.typeText, userType === 'consumer' && styles.activeTypeText]}>Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, userType === 'admin' && styles.activeType]}
                onPress={() => setUserType('admin')}
              >
                <Text style={[styles.typeText, userType === 'admin' && styles.activeTypeText]}>Shop Owner</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.title}>{isRegistering ? 'Create Account' : 'Login'}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {isRegistering && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={isRegistering ? handleRegister : handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>{isRegistering ? 'Register' : 'Login'}</Text>
            )}
          </TouchableOpacity>

          {!isRegistering && (
            <View style={styles.demoContainer}>
              <Text style={styles.demoText}>Staff Login:</Text>
              <Text style={styles.demoCredentials}>admin / admin123</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#2196F3',
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderRadius: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeType: {
    backgroundColor: 'white',
    elevation: 2,
  },
  typeText: {
    fontSize: 14,
    color: '#666',
  },
  activeTypeText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff9c4',
    borderRadius: 8,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f57f17',
  },
  demoCredentials: {
    fontSize: 12,
    color: '#666',
  },
});

export default LoginScreen;
