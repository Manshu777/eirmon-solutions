import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity,  Modal, Alert, StyleSheet, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import { config } from '../../config/config';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LeavesIndex() {
  const navigation = useNavigation();
  const [leaves, setLeaves] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newLeave, setNewLeave] = useState({
    user_id: '',
    date: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const perPage = 10;

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

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Handle date change
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNewLeave({ ...newLeave, date: formatDate(selectedDate) });
    }
  };

  // Fetch staff users for picker
  const fetchStaffUsers = async () => {
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error('No auth token found. Please log in.');
      }
      const url = new URL(`${config.BASE_URL}${config.API_ENDPOINTS.USERS.INDEX}`);
      url.search = new URLSearchParams({ role: 'staff' }).toString();

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
        setStaffUsers(data.data.map(user => ({
          label: user.name,
          value: user.id.toString(),
        })));
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch staff users.');
      }
    } catch (error) {
      console.error('Fetch staff users error:', error);
      Alert.alert('Error', 'An error occurred while fetching staff users.');
    }
  };

  // Fetch leaves from API with pagination and search
  const fetchLeaves = async (page = 1, query = '') => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error('No auth token found. Please log in.');
      }
      const url = new URL(`${config.BASE_URL}${config.API_ENDPOINTS.LEAVES.INDEX}`);
      const params = { page, per_page: perPage };
      if (query) {
        params.search = query;
      }
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
      if (data.message === 'Leaves retrieved successfully.') {
        setLeaves(data.data);
        setTotalPages(data.last_page || 1);
        setCurrentPage(data.current_page || page);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch leaves.');
      }
    } catch (error) {
      console.error('Fetch leaves error:', error);
      Alert.alert('Error', 'An error occurred while fetching leaves. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearch = (text) => {
    setSearchQuery(text);
    setCurrentPage(1);
    fetchLeaves(1, text);
  };

  // Add or update leave
  const handleAddLeave = async () => {
    if (!newLeave.user_id || !newLeave.date) {
      Alert.alert('Error', 'Please fill in all required fields (Staff, Date).');
      return;
    }

    try {
      await getCsrfCookie();
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing
        ? config.API_ENDPOINTS.LEAVES.UPDATE.replace('{id}', editId)
        : config.API_ENDPOINTS.LEAVES.STORE;

      const payload = {
        user_id: parseInt(newLeave.user_id) || 0,
        date: newLeave.date,
      };

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
        Alert.alert('Success', data.message || 'Leave saved successfully!');
        setNewLeave({ user_id: '', date: '' });
        setModalVisible(false);
        setIsEditing(false);
        setEditId(null);
        fetchLeaves(currentPage, searchQuery);
      } else {
        Alert.alert('Error', data.message || 'Failed to save leave.', [
          { text: 'OK', onPress: () => console.log('Validation errors:', data.errors) },
        ]);
      }
    } catch (error) {
      console.error('Save leave error:', error);
      Alert.alert('Error', 'An error occurred while saving the leave. Please try again.');
    }
  };

  // Fetch single leave for editing
  const fetchSingleLeave = async (id) => {
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const endpoint = config.API_ENDPOINTS.LEAVES.SHOW.replace('{id}', id);
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
      if (data.message === 'Leave retrieved successfully.') {
        setNewLeave({
          user_id: data.data.user_id.toString(),
          date: data.data.date,
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch leave details.');
      }
    } catch (error) {
      console.error('Fetch single leave error:', error);
      Alert.alert('Error', 'An error occurred while fetching leave details.');
    }
  };

  // Edit leave
  const handleEditLeave = (item) => {
    setEditId(item.id);
    setIsEditing(true);
    fetchSingleLeave(item.id);
    setModalVisible(true);
  };

  // Delete leave
  const handleDeleteLeave = async (id) => {
    Alert.alert('Delete Leave', `Are you sure you want to delete leave ${id}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await getCsrfCookie();
            const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
            const endpoint = config.API_ENDPOINTS.LEAVES.DESTROY.replace('{id}', id);
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
              Alert.alert('Success', data.message || 'Leave deleted successfully!');
              fetchLeaves(currentPage, searchQuery);
            } else {
              Alert.alert('Error', data.message || 'Failed to delete leave.');
            }
          } catch (error) {
            console.error('Delete leave error:', error);
            Alert.alert('Error', 'An error occurred while deleting the leave. Please try again.');
          }
        },
      },
    ]);
  };

  // Fetch staff users and leaves on mount and when page or search changes
  useEffect(() => {
    fetchStaffUsers();
    fetchLeaves(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const renderLeaveItem = ({ item, index }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Leave #{item.id}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Sr No:</Text>
        <Text style={styles.value}>{(currentPage - 1) * perPage + index + 1}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Staff:</Text>
        <Text style={styles.value}>{item.user ? item.user.name : 'Unknown'}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{item.date}</Text>
      </View>
      <View style={[styles.field, { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#6a11cb' }]}
          onPress={() => handleEditLeave(item)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF4444', marginLeft: 10 }]}
          onPress={() => handleDeleteLeave(item.id)}
        >
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.header}>Leaves</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <Icon name="plus" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}

            placeholder="Search leaves by staff name..."
            placeholderTextColor="#151515ff"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        </View>

        <View style={styles.innerContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6a11cb" />
            </View>
          ) : leaves.length === 0 ? (
            <Text style={styles.noDataText}>No leaves found.</Text>
          ) : (
            <>
              <FlatList
                data={leaves}
                renderItem={renderLeaveItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.list}
              />
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
            </>
          )}
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setNewLeave({ user_id: '', date: '' });
            setModalVisible(false);
            setIsEditing(false);
            setEditId(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Leave' : 'Add New Leave'}</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Staff *</Text>
                <View style={styles.selectContainer}>
                  <Picker
                    style={{ height: 90, justifyContent: 'center' }}
                    selectedValue={newLeave.user_id}
                    onValueChange={(value) => setNewLeave({ ...newLeave, user_id: value })}
        
                  >
                    <Picker.Item label="Select Staff" value="" />
                    {staffUsers.map((user) => (
                      <Picker.Item key={user.value} label={user.label} value={user.value} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Date *</Text>
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {newLeave.date || 'Select Date (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={newLeave.date && !isNaN(new Date(newLeave.date).getTime())
                      ? new Date(newLeave.date)
                      : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )}
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddLeave}
                >
                  <Text style={styles.buttonText}>{isEditing ? 'Update Leave' : 'Add Leave'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, styles.cancelButton]}
                  onPress={() => {
                    setNewLeave({ user_id: '', date: '' });
                    setModalVisible(false);
                    setIsEditing(false);
                    setEditId(null);
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  searchIcon: {
    padding: 10,
  },
  innerContainer: {
    flex: 1,
    padding: 20,
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
  dateText: {
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
  disabledButton: {
    backgroundColor: '#ccc',
  },
  paginationText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});