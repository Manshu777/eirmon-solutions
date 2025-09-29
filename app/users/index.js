import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Alert, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import { config } from '../../config/config';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UsersIndex() {
  const navigation = useNavigation();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false); // New state for action loading
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    is_available: 'No',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  const SelectRoles = [
    { key: 'admin', value: 'admin' },
    { key: 'staff', value: 'staff' },
    { key: 'manager', value: 'manager' },
  ];

  const SelectAvailability = [
    { key: '1', value: 'Yes' },
    { key: '0', value: 'No' },
  ];

  // Fetch CSRF token
  const getCsrfCookie = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.CSRF_COOKIE}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF cookie');
      }
    } catch (error) {
      console.error('Error fetching CSRF cookie:', error);
      throw error;
    }
  };

  // Fetch users from API with pagination and search
  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error('No auth token found. Please log in.');
      }
      const endpoint = searchQuery ? config.API_ENDPOINTS.USERS.SEARCH : config.API_ENDPOINTS.USERS.INDEX;
      const url = new URL(`${config.BASE_URL}${endpoint}`);
      const params = { page, per_page: perPage };
      if (searchQuery) params.search = searchQuery;
      url.search = new URLSearchParams(params).toString();

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.message === 'Users retrieved successfully.') {
        setUsers(data.data);
        setTotalPages(data.last_page || 1);
        setCurrentPage(data.current_page || page);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch users.');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      Alert.alert('Error', 'An error occurred while fetching users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add or update user
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || (!isEditing && !newUser.password)) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, and Password for new users).');
      return;
    }

    setIsActionLoading(true); // Start action loading
    try {
      await getCsrfCookie();
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing
        ? config.API_ENDPOINTS.USERS.UPDATE.replace('{id}', editId)
        : config.API_ENDPOINTS.USERS.STORE;

      const payload = { ...newUser };
      if (!isEditing && !payload.password) {
        Alert.alert('Error', 'Password is required for new users.');
        setIsActionLoading(false);
        return;
      } else if (isEditing && !payload.password) {
        delete payload.password; // Don't send password if not updated
      }

      payload.is_available = newUser.is_available === 'Yes' ? 1 : 0;

      const response = await fetch(`${config.BASE_URL}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', data.message || 'User saved successfully!');
        setNewUser({ name: '', email: '', password: '', role: 'staff', is_available: 'No' });
        setModalVisible(false);
        setIsEditing(false);
        setEditId(null);
        fetchUsers(currentPage);
      } else {
        Alert.alert('Error', data.message || 'Failed to save user.');
      }
    } catch (error) {
      console.error('Save user error:', error);
      Alert.alert('Error', 'An error occurred while saving the user. Please try again.');
    } finally {
      setIsActionLoading(false); // Stop action loading
    }
  };

  // Fetch single user for editing
  const fetchSingleUser = async (id) => {
    setIsActionLoading(true); // Start action loading
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const endpoint = config.API_ENDPOINTS.USERS.SHOW.replace('{id}', id);
      const response = await fetch(`${config.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.message === 'User retrieved successfully.') {
        setNewUser({
          name: data.data.name || '',
          email: data.data.email || '',
          password: '',
          role: data.data.role || 'staff',
          is_available: data.data.is_available ? 'Yes' : 'No',
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch user details.');
      }
    } catch (error) {
      console.error('Fetch single user error:', error);
      Alert.alert('Error', 'An error occurred while fetching user details.');
    } finally {
      setIsActionLoading(false); // Stop action loading
    }
  };

  // Edit user
  const handleEditUser = (item) => {
    setEditId(item.id);
    setIsEditing(true);
    fetchSingleUser(item.id);
    setModalVisible(true);
  };

  // Delete user
  const handleDeleteUser = async (id) => {
    Alert.alert('Delete User', `Are you sure you want to delete user ${id}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setIsActionLoading(true); // Start action loading
          try {
            await getCsrfCookie();
            const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
            const endpoint = config.API_ENDPOINTS.USERS.DESTROY.replace('{id}', id);
            const response = await fetch(`${config.BASE_URL}${endpoint}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              credentials: 'include',
            });

            const data = await response.json();
            if (response.ok) {
              Alert.alert('Success', data.message || 'User deleted successfully!');
              fetchUsers(currentPage);
            } else {
              Alert.alert('Error', data.message || 'Failed to delete user.');
            }
          } catch (error) {
            console.error('Delete user error:', error);
            Alert.alert('Error', 'An error occurred while deleting the user. Please try again.');
          } finally {
            setIsActionLoading(false); // Stop action loading
          }
        },
      },
    ]);
  };

  // Adjust currentPage if it exceeds totalPages after fetch (e.g., after deletes)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0) {
      setCurrentPage(1); // Reset to 1 if no pages
    }
  }, [totalPages, currentPage]);

  // Fetch users on mount and when page or search query changes
  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, searchQuery]);

  const renderUserItem = ({ item, index }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>User #{item.id}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Sr No:</Text>
        <Text style={styles.value}>{(currentPage - 1) * perPage + index + 1}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{item.name}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{item.email}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Role:</Text>
        <Text style={styles.value}>{item.role}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Available:</Text>
        <Text style={styles.value}>{item.is_available ? 'Yes' : 'No'}</Text>
      </View>
      <View style={[styles.field, { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#6a11cb' }]}
          onPress={() => handleEditUser(item)}
          disabled={isActionLoading}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF4444', marginLeft: 10 }]}
          onPress={() => handleDeleteUser(item.id)}
          disabled={isActionLoading}
        >
          {isActionLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionText}>Delete</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.header}>Staff Users</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Icon name="plus" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.innerContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email"
              placeholderTextColor="#151515ff"
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Icon name="times-circle" size={20} color="#6a11cb" />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flex: 1 }}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6a11cb" />
              </View>
            ) : users.length === 0 ? (
              <Text style={styles.noDataText}>
                {searchQuery ? 'No users match your search.' : 'No users found.'}
              </Text>
            ) : (
              <>
                <FlatList
                  data={users}
                  renderItem={renderUserItem}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.list}
                />
                {totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <TouchableOpacity
                      style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
                      disabled={currentPage === 1}
                      onPress={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    >
                      <Text style={styles.paginationText}>Previous</Text>
                    </TouchableOpacity>
                    <Text style={styles.paginationText}>
                      Page {currentPage} of {totalPages}
                    </Text>
                    <TouchableOpacity
                      style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
                      disabled={currentPage === totalPages}
                      onPress={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    >
                      <Text style={styles.paginationText}>Next</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setNewUser({ name: '', email: '', password: '', role: 'staff', is_available: 'No' });
          setModalVisible(false);
          setIsEditing(false);
          setEditId(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit User' : 'Add New User'}</Text>
            {isActionLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#6a11cb" />
                <Text style={styles.modalLoadingText}>Processing...</Text>
              </View>
            ) : (
              <>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter name"
                    placeholderTextColor="#151515ff"
                    value={newUser.name}
                    onChangeText={(text) => setNewUser({ ...newUser, name: text })}
                    autoCapitalize="words"
                    editable={!isActionLoading}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Email *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter email"
                    placeholderTextColor="#151515ff"
                    value={newUser.email}
                    onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isActionLoading}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>{isEditing ? 'New Password (optional)' : 'Password *'}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={isEditing ? 'Enter new password (optional)' : 'Enter password'}
                    placeholderTextColor="#151515ff"
                    value={newUser.password}
                    onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                    secureTextEntry={true}
                    editable={!isActionLoading}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Role *</Text>
                  <View style={styles.selectContainer}>
                    <Picker
                      selectedValue={newUser.role}
                        style={{ height: 70, justifyContent: 'center' }}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                 
                      enabled={!isActionLoading}
                    >
                      {SelectRoles.map((item) => (
                        <Picker.Item key={item.key} label={item.value} value={item.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Available *</Text>
                  <View style={styles.selectContainer}>
                    <Picker
                      selectedValue={newUser.is_available}
                       style={{ height: 70, justifyContent: 'center' }}
                      onValueChange={(value) => setNewUser({ ...newUser, is_available: value })}
        
                      enabled={!isActionLoading}
                    >
                      {SelectAvailability.map((item) => (
                        <Picker.Item key={item.key} label={item.value} value={item.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.submitButton, isActionLoading && styles.disabledButton]}
                    onPress={handleAddUser}
                    disabled={isActionLoading}
                  >
                    <Text style={styles.buttonText}>{isEditing ? 'Update User' : 'Add User'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, styles.cancelButton]}
                    onPress={() => {
                      setNewUser({ name: '', email: '', password: '', role: 'staff', is_available: 'No' });
                      setModalVisible(false);
                      setIsEditing(false);
                      setEditId(null);
                    }}
                    disabled={isActionLoading}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  backButton: {
    padding: 10,
  },
  addButton: {
    padding: 10,
  },
  innerContainer: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    paddingRight: 40,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    padding: 5,
  },
  list: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6a11cb',
    marginBottom: 10,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  formField: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  selectContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
  },
  picker: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#6a11cb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  paginationButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: '#6a11cb',
  },
  paginationText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});