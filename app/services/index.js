import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Alert, StyleSheet, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import { config } from '../../config/config';
import { SafeAreaView } from 'react-native-safe-area-context';

const BookingsIndex = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [newService, setNewService] = useState({
    service_name: '',
    sub_category: '',
    price: '',
    time: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  // Fetch services from API with pagination and search
  const fetchServices = async (page = 1) => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const endpoint = searchQuery ? config.API_ENDPOINTS.SERVICES.SEARCH : config.API_ENDPOINTS.SERVICES.INDEX;
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
      if (data.message === 'Services retrieved successfully.') {
        setServices(data.data);
        setTotalPages(data.last_page || 1);
        setCurrentPage(data.current_page || page);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch services.');
      }
    } catch (error) {
      console.error('Fetch services error:', error);
      Alert.alert('Error', 'An error occurred while fetching services. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Adjust currentPage if it exceeds totalPages after fetch
  useEffect(() => {
    if (!isLoading && currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [isLoading, currentPage, totalPages]);

  // Add or update service
  const handleAddService = async () => {
    if (!newService.service_name || !newService.price || !newService.time) {
      Alert.alert('Error', 'Please fill in all required fields (Service Name, Price, Time).');
      return;
    }

    setIsOperationLoading(true);
    try {
      await getCsrfCookie();
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing
        ? config.API_ENDPOINTS.SERVICES.UPDATE.replace('{id}', editId)
        : config.API_ENDPOINTS.SERVICES.STORE;
      const response = await fetch(`${config.BASE_URL}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(newService),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', data.message || 'Service saved successfully!');
        setNewService({ service_name: '', sub_category: '', price: '', time: '' });
        setModalVisible(false);
        setIsEditing(false);
        setEditId(null);
        fetchServices(currentPage);
      } else {
        Alert.alert('Error', data.message || 'Failed to save service.');
      }
    } catch (error) {
      console.error('Save service error:', error);
      Alert.alert('Error', 'An error occurred while saving the service. Please try again.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  // Fetch single service for editing
  const fetchSingleService = async (id) => {
    setIsOperationLoading(true);
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const endpoint = config.API_ENDPOINTS.SERVICES.SHOW.replace('{id}', id);
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
      if (data.message === 'Service retrieved successfully.') {
        setNewService({
          service_name: data.data.service_name || data.data.services || '',
          sub_category: data.data.sub_category || '',
          price: data.data.price ? data.data.price.toString() : '',
          time: data.data.time ? data.data.time.toString() : '',
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch service details.');
      }
    } catch (error) {
      console.error('Fetch single service error:', error);
      Alert.alert('Error', 'An error occurred while fetching service details.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  // Edit service
  const handleEditService = (item) => {
    setEditId(item.id);
    setIsEditing(true);
    fetchSingleService(item.id);
    setModalVisible(true);
  };

  // Delete service
  const handleDeleteService = async (id) => {
    Alert.alert('Delete Service', `Are you sure you want to delete service ${id}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setIsOperationLoading(true);
          try {
            await getCsrfCookie();
            const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
            const endpoint = config.API_ENDPOINTS.SERVICES.DESTROY.replace('{id}', id);
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
              Alert.alert('Success', data.message || 'Service deleted successfully!');
              fetchServices(currentPage);
            } else {
              Alert.alert('Error', data.message || 'Failed to delete service.');
            }
          } catch (error) {
            console.error('Delete service error:', error);
            Alert.alert('Error', 'An error occurred while deleting the service. Please try again.');
          } finally {
            setIsOperationLoading(false);
          }
        },
      },
    ]);
  };

  // Fetch services on mount and when page or search query changes
  useEffect(() => {
    fetchServices(currentPage);
  }, [currentPage, searchQuery]);

  const renderServiceItem = ({ item, index }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Service #{item.id}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Sr No:</Text>
        <Text style={styles.value}>{(currentPage - 1) * perPage + index + 1}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Service:</Text>
        <Text style={styles.value}>{item.service_name || item.services}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Sub Category:</Text>
        <Text style={styles.value}>{item.sub_category}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Price ($):</Text>
        <Text style={styles.value}>{item.price}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Time:</Text>
        <Text style={styles.value}>{item.time} min</Text>
      </View>
      <View style={[styles.field, { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#6a11cb' }]}
          onPress={() => handleEditService(item)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF4444', marginLeft: 10 }]}
          onPress={() => handleDeleteService(item.id)}
        >
          <Text style={styles.actionText}>Delete</Text>
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
        <Text style={styles.header}>Services</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Icon name="plus" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.innerContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholderTextColor="#151515ff"
              placeholder="Search by service or sub-category"
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
            ) : services.length === 0 ? (
              <Text style={styles.noDataText}>
                {searchQuery ? 'No services match your search.' : 'No services found.'}
              </Text>
            ) : (
              <>
                <FlatList
                  data={services}
                  renderItem={renderServiceItem}
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
                  <Text style={styles.paginationTextPage}>
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
        </View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setNewService({ service_name: '', sub_category: '', price: '', time: '' });
          setModalVisible(false);
          setIsEditing(false);
          setEditId(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {isOperationLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6a11cb" />
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>{isEditing ? 'Edit Service' : 'Add New Service'}</Text>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Service Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter service name"
                    placeholderTextColor="#151515ff"
                    value={newService.service_name}
                    onChangeText={(text) => setNewService({ ...newService, service_name: text })}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Sub Category</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter sub category"
                    placeholderTextColor="#151515ff"
                    value={newService.sub_category}
                    onChangeText={(text) => setNewService({ ...newService, sub_category: text })}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Price ($)*</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter price"
                    placeholderTextColor="#151515ff"
                    value={newService.price}
                    onChangeText={(text) => setNewService({ ...newService, price: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Time (minutes)*</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter time in minutes"
                    placeholderTextColor="#151515ff"
                    value={newService.time}
                    onChangeText={(text) => setNewService({ ...newService, time: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleAddService}
                    disabled={isOperationLoading}
                  >
                    <Text style={styles.buttonText}>{isEditing ? 'Update Service' : 'Add Service'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, styles.cancelButton]}
                    onPress={() => {
                      setNewService({ service_name: '', sub_category: '', price: '', time: '' });
                      setModalVisible(false);
                      setIsEditing(false);
                      setEditId(null);
                    }}
                    disabled={isOperationLoading}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default BookingsIndex;

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
    padding: 5,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 13,
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
  paginationTextPage: {
    fontSize: 14,
    color: '#6a11cb',
    fontWeight: '600',
  },
});