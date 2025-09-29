import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { config } from '../../config/config';

// Get screen width for responsive design
const screenWidth = Dimensions.get('window').width;

export default function ClientsIndex() {
  const navigation = useNavigation();
  const router = useRouter();
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // State for search input
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    notes: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortBy, setSortBy] = useState('created_at_desc');
  const perPage = 10;

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewClient({ ...newClient, date_of_birth: formatDate(selectedDate) });
    }
  };

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

  // Fetch clients from API
  const fetchClients = async (page = 1) => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error('No auth token found. Please log in.');
      }
      // Use search endpoint if searchQuery exists, otherwise use view endpoint
      const endpoint = searchQuery
        ? config.API_ENDPOINTS.LOCALDATA.SEARCH
        : config.API_ENDPOINTS.LOCALDATA.VIEW;
      const url = new URL(`${config.BASE_URL}${endpoint}`);
      const params = { page, per_page: perPage, sort_by: sortBy };

      if (startDate) params.start_date = formatDate(startDate);
      if (endDate) params.end_date = formatDate(endDate);
      if (searchQuery) params.search = searchQuery; // Add search query to params

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
      if (data.success) {
        setClients(data.data.customers.data);
        setTotalPages(data.data.customers.last_page);
        setCurrentPage(data.data.customers.current_page);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch clients.');
      }
    } catch (error) {
      console.error('Fetch clients error:', error);
      Alert.alert('Error', 'An error occurred while fetching clients. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new client
  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone || !newClient.email) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Phone, Email).');
      return;
    }

    try {
      await getCsrfCookie();
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.LOCALDATA.STORE_CUSTOMER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(newClient),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Client added successfully!');
        setNewClient({ name: '', phone: '', email: '', date_of_birth: '', notes: '' });
        setModalVisible(false);
        fetchClients(currentPage); // Refetch on current page after add
      } else {
        Alert.alert('Error', data.message || 'Failed to add client.');
      }
    } catch (error) {
      console.error('Add client error:', error);
      Alert.alert('Error', 'An error occurred while adding the client. Please try again.');
    }
  };

  // Fetch clients on mount and when dependencies change
  useEffect(() => {
    fetchClients(currentPage);
  }, [startDate, endDate, currentPage, sortBy, searchQuery]); // Added searchQuery as dependency

  // Adjust currentPage if it exceeds totalPages after fetch (e.g., after deletes that reduce pages)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0) {
      setCurrentPage(1); // Reset to 1 if no pages
    }
  }, [totalPages, currentPage]);

  const renderClientItem = ({ item, index }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.field}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{item.name}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Phone:</Text>
        <Text style={styles.value}>{item.phone}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{item.email}</Text>
      </View>
      {item.date_of_birth && (
        <View style={styles.field}>
          <Text style={styles.label}>Date of Birth:</Text>
          <Text style={styles.value}>{item.date_of_birth}</Text>
        </View>
      )}
      {item.notes && (
        <View style={styles.field}>
          <Text style={styles.label}>Notes:</Text>
          <Text style={styles.value}>{item.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.header}>Clients</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Icon name="plus" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.innerContainer}>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or phone"
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

          <View style={{ marginTop: 10, flex: 1, paddingHorizontal: 15 }}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6a11cb" />
              </View>
            ) : clients.length === 0 ? (
              <Text style={styles.noDataText}>
                {searchQuery ? 'No clients match your search.' : 'No clients found.'}
              </Text>
            ) : (
              <FlatList
                data={clients}
                renderItem={renderClientItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.list}
              />
            )}
          </View>
          {totalPages > 1 && ( // Hide pagination if only 1 page or no data
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                <Text style={styles.paginationText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.paginationTextNumber}>
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
        </View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scrollWrapper}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Client</Text>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter name"
                    placeholderTextColor="#151515ff"
                    value={newClient.name}
                    onChangeText={(text) => setNewClient({ ...newClient, name: text })}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Phone *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholderTextColor="#151515ff"
                    placeholder="Enter phone number"
                    value={newClient.phone}
                    onChangeText={(text) => setNewClient({ ...newClient, phone: text })}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Email *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter email"
                    placeholderTextColor="#151515ff"
                    value={newClient.email}
                    onChangeText={(text) => setNewClient({ ...newClient, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Date of Birth</Text>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateText}>
                      {newClient.date_of_birth || 'Select Date (YYYY-MM-DD)'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={
                        newClient.date_of_birth && !isNaN(new Date(newClient.date_of_birth).getTime())
                          ? new Date(newClient.date_of_birth)
                          : new Date()
                      }
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddClient}>
                    <Text style={styles.buttonText}>Add Client</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ff',
  },
  safeArea: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',

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
    marginHorizontal: 15,
    marginTop: 10,
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    padding: 5,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6a11cb',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    width: 120,
  },
  value: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  formField: {
    width: '100%',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#d1d5db',
    width: '100%',
  },
  dateText: {
    fontSize: 16,
    color: '#1f2937',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 10,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#6a11cb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
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
    color: '#4B5563',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paginationButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#6a11cb',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  paginationText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  paginationTextNumber: {
    fontSize: 14,
    color: '#6a11cb',
    fontWeight: '600',
  },
});