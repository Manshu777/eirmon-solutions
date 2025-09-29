import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config } from '../../config/config';

export default function OffersIndex() {
  const navigation = useNavigation();
  const router = useRouter();
  const [offers, setOffers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    discount_type: 'flat',
    discount_value: '',
    valid_from: '',
    valid_to: '',
    is_active: 'No',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showValidFromPicker, setShowValidFromPicker] = useState(false);
  const [showValidToPicker, setShowValidToPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientType, setRecipientType] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectAllCustomers, setSelectAllCustomers] = useState(false);
  const [currentOffer, setCurrentOffer] = useState(null);
  const perPage = 10;

  const SelectDiscountTypes = [
    { key: 'flat', value: 'flat' },
    { key: 'percentage', value: 'percentage' },
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

  // Fetch offers from API with pagination and search
  const fetchOffers = async (page = 1, query = '') => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error('No auth token found. Please log in.');
      }
      const url = new URL(`${config.BASE_URL}${config.API_ENDPOINTS.OFFERS.INDEX}`);
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
      if (data.message === 'Offers retrieved successfully.') {
        setOffers(data.data);
        setTotalPages(data.last_page || 1);
        setCurrentPage(data.current_page || page);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch offers.');
      }
    } catch (error) {
      console.error('Fetch offers error:', error);
      Alert.alert('Error', 'An error occurred while fetching offers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const response = await fetch(`${config.BASE_URL}/api/localdata/showallcus`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      console.log('customerdata',data.data.customers)
      if (data) {
        setCustomers(data.data.customers);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch customers.');
      }
    } catch (error) {
      console.error('Fetch customers error:', error);
      Alert.alert('Error', 'An error occurred while fetching customers.');
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const response = await fetch(`${config.BASE_URL}/api/employees`, {
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
        setEmployees(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch employees.');
      }
    } catch (error) {
      console.error('Fetch employees error:', error);
      Alert.alert('Error', 'An error occurred while fetching employees.');
    }
  };

  // Handle search input for offers
  const handleSearch = (text) => {
    setSearchQuery(text);
    setCurrentPage(1);
    fetchOffers(1, text);
  };

  // Handle customer search
  const handleCustomerSearch = (text) => {
    setCustomerSearch(text);
  };

  // Handle select all customers
  const handleSelectAllCustomers = () => {
    setSelectAllCustomers(!selectAllCustomers);
    if (!selectAllCustomers) {
      const filteredCustomers = customers.filter((c) =>
        `${c.name} ${c.phone}`.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setSelectedRecipients(filteredCustomers.map((c) => c.phone));
    } else {
      setSelectedRecipients([]);
    }
  };

  // Handle individual customer selection
  const handleCustomerSelect = (phone) => {
    setSelectedRecipients((prev) =>
      prev.includes(phone)
        ? prev.filter((p) => p !== phone)
        : [...prev, phone]
    );
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Handle date changes for valid_from and valid_to
  const handleValidFromChange = (event, selectedDate) => {
    setShowValidFromPicker(false);
    if (selectedDate) {
      setNewOffer({ ...newOffer, valid_from: formatDate(selectedDate) });
    }
  };

  const handleValidToChange = (event, selectedDate) => {
    setShowValidToPicker(false);
    if (selectedDate) {
      if (newOffer.valid_from && new Date(selectedDate) < new Date(newOffer.valid_from)) {
        Alert.alert('Error', 'Valid To date cannot be before Valid From date.');
        return;
      }
      setNewOffer({ ...newOffer, valid_to: formatDate(selectedDate) });
    }
  };

  // Add or update offer
  const handleAddOffer = async () => {
    if (!newOffer.title || !newOffer.discount_type || !newOffer.discount_value || !newOffer.valid_from || !newOffer.valid_to) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Discount Type, Discount Value, Valid From, Valid To).');
      return;
    }

    try {
      await getCsrfCookie();
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing
        ? config.API_ENDPOINTS.OFFERS.UPDATE.replace('{id}', editId)
        : config.API_ENDPOINTS.OFFERS.STORE;

      const payload = {
        ...newOffer,
        discount_value: parseFloat(newOffer.discount_value) || 0,
        is_active: newOffer.is_active === 'Yes' ? 1 : 0,
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
        Alert.alert('Success', data.message || 'Offer saved successfully!');
        setNewOffer({
          title: '',
          description: '',
          discount_type: 'flat',
          discount_value: '',
          valid_from: '',
          valid_to: '',
          is_active: 'No',
        });
        setModalVisible(false);
        setIsEditing(false);
        setEditId(null);
        fetchOffers(currentPage, searchQuery);
      } else {
        Alert.alert('Error', data.message || 'Failed to save offer.', [
          { text: 'OK', onPress: () => console.log('Validation errors:', data.errors) },
        ]);
      }
    } catch (error) {
      console.error('Save offer error:', error);
      Alert.alert('Error', 'An error occurred while saving the offer. Please try again.');
    }
  };

  // Fetch single offer for editing
  const fetchSingleOffer = async (id) => {
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const endpoint = config.API_ENDPOINTS.OFFERS.SHOW.replace('{id}', id);
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
      if (data.message === 'Offer retrieved successfully.') {
        setNewOffer({
          title: data.data.title || '',
          description: data.data.description || '',
          discount_type: data.data.discount_type || 'flat',
          discount_value: data.data.discount_value ? data.data.discount_value.toString() : '',
          valid_from: data.data.valid_from || '',
          valid_to: data.data.valid_to || '',
          is_active: data.data.is_active ? 'Yes' : 'No',
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch offer details.');
      }
    } catch (error) {
      console.error('Fetch single offer error:', error);
      Alert.alert('Error', 'An error occurred while fetching offer details.');
    }
  };

  // Edit offer
  const handleEditOffer = (item) => {
    setEditId(item.id);
    setIsEditing(true);
    fetchSingleOffer(item.id);
    setModalVisible(true);
  };

  // Delete offer
  const handleDeleteOffer = async (id) => {
    Alert.alert('Delete Offer', `Are you sure you want to delete offer ${id}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await getCsrfCookie();
            const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
            const endpoint = config.API_ENDPOINTS.OFFERS.DESTROY.replace('{id}', id);
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
              Alert.alert('Success', data.message || 'Offer deleted successfully!');
              fetchOffers(currentPage, searchQuery);
            } else {
              Alert.alert('Error', data.message || 'Failed to delete offer.');
            }
          } catch (error) {
            console.error('Delete offer error:', error);
            Alert.alert('Error', 'An error occurred while deleting the offer. Please try again.');
          }
        },
      },
    ]);
  };

  // Send offer to recipients
  const handleSendOffer = async (item) => {
    setCurrentOffer(item);
    setRecipientType('customers');
    setSelectedRecipients([]);
    setCustomerSearch('');
    setSelectAllCustomers(false);
    await fetchCustomers();

    setSendModalVisible(true);
  };

  // Handle send offer submission
  const handleSendOfferSubmit = async () => {
    if (!recipientType || selectedRecipients.length === 0) {
      Alert.alert('Error', 'Please select a recipient type and at least one recipient.');
      return;
    }

    try {
      await getCsrfCookie();
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const endpoint = config.API_ENDPOINTS.OFFERS.SEND.replace('{id}', currentOffer.id);
      const response = await fetch(`${config.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          recipient_type : 'customers',
          recipients: selectedRecipients,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', `Offer sent successfully! SMS: ${data.data.sms_sent}, Emails: ${data.data.emails_sent}`);
        setSendModalVisible(false);
        setSelectedRecipients([]);
        setCustomerSearch('');
        setSelectAllCustomers(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to send offer.');
      }
    } catch (error) {
      console.error('Send offer error:', error);
      Alert.alert('Error', 'An error occurred while sending the offer. Please try again.');
    }
  };

  // Fetch offers on mount and when page or search changes
  useEffect(() => {
    fetchOffers(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  // Generate page numbers for pagination
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <TouchableOpacity
          key={i}
          style={[styles.paginationButton, currentPage === i ? styles.activePageButton : null]}
          onPress={() => setCurrentPage(i)}
        >
          <Text style={[styles.paginationText, currentPage === i ? styles.activePageText : null]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return pageNumbers;
  };

  const renderOfferItem = ({ item, index }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Offer #{item.id}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Sr No:</Text>
        <Text style={styles.value}>{(currentPage - 1) * perPage + index + 1}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Title:</Text>
        <Text style={styles.value}>{item.title}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Description:</Text>
        <Text style={styles.value}>{item.description || 'N/A'}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Discount Type:</Text>
        <Text style={styles.value}>{item.discount_type}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Discount Value:</Text>
        <Text style={styles.value}>
          {item.discount_value}
          {item.discount_type === 'percentage' ? '%' : ''}
        </Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Valid From:</Text>
        <Text style={styles.value}>{item.valid_from}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Valid To:</Text>
        <Text style={styles.value}>{item.valid_to}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Active:</Text>
        <Text style={styles.value}>{item.is_active ? 'Yes' : 'No'}</Text>
      </View>
      <View style={[styles.field, { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#6a11cb' }]}
          onPress={() => handleEditOffer(item)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF4444', marginLeft: 10 }]}
          onPress={() => handleDeleteOffer(item.id)}
        >
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#28a745', marginLeft: 10 }]}
          onPress={() => handleSendOffer(item)}
        >
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCustomerItem = ({ item }) => {
    const isVisible = customerSearch
      ? `${item.name} ${item.phone}`.toLowerCase().includes(customerSearch.toLowerCase())
      : true;
    if (!isVisible) return null;

    return (
      <View style={styles.customerItem}>
        <TouchableOpacity
          onPress={() => handleCustomerSelect(item.phone)}
          style={styles.customerCheckbox}
        >
          <Icon
            name={selectedRecipients.includes(item.phone) ? 'check-square-o' : 'square-o'}
            size={20}
            color="#333"
          />
          <Text style={styles.customerLabel}>
            {item.name} ({item.phone})
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.header}>Offers</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <Icon name="plus" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            
            placeholder="Search offers by title..."
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
          ) : offers.length === 0 ? (
            <Text style={styles.noDataText}>No offers found.</Text>
          ) : (
            <>
              <FlatList
                data={offers}
                renderItem={renderOfferItem}
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
                <View style={styles.pageNumbersContainer}>
                  {renderPageNumbers()}
                </View>
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

        {/* Add/Edit Offer Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setNewOffer({
              title: '',
              description: '',
              discount_type: 'flat',
              discount_value: '',
              valid_from: '',
              valid_to: '',
              is_active: 'No',
            });
            setModalVisible(false);
            setIsEditing(false);
            setEditId(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Offer' : 'Add New Offer'}</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter title"
                  placeholderTextColor="#151515ff"
                  value={newOffer.title}
                  onChangeText={(text) => setNewOffer({ ...newOffer, title: text })}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.formInput]}
                  placeholder="Enter description"
                  placeholderTextColor="#151515ff"
                  value={newOffer.description}
                  onChangeText={(text) => setNewOffer({ ...newOffer, description: text })}
                  multiline
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Discount Type *</Text>
                <View style={styles.selectContainer}>
                  <Picker
                    style={{ height: 80, justifyContent: 'center' }}
                    selectedValue={newOffer.discount_type}
                    onValueChange={(value) => setNewOffer({ ...newOffer, discount_type: value })}
   
                  >
                    {SelectDiscountTypes.map((item) => (
                      <Picker.Item key={item.key} label={item.value} value={item.value} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Discount Value *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter discount value"
                  placeholderTextColor="#151515ff"
                  value={newOffer.discount_value}
                  onChangeText={(text) => setNewOffer({ ...newOffer, discount_value: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Valid From *</Text>
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={() => setShowValidFromPicker(true)}
                >
                  <Text style={styles.dateText}>
                    {newOffer.valid_from || 'Select Date (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>
                {showValidFromPicker && (
                  <DateTimePicker
                    value={
                      newOffer.valid_from && !isNaN(new Date(newOffer.valid_from).getTime())
                        ? new Date(newOffer.valid_from)
                        : new Date()
                    }
                    mode="date"
                    display="default"
                    onChange={handleValidFromChange}
                  />
                )}
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Valid To *</Text>
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={() => setShowValidToPicker(true)}
                >
                  <Text style={styles.dateText}>
                    {newOffer.valid_to || 'Select Date (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>
                {showValidToPicker && (
                  <DateTimePicker
                    value={
                      newOffer.valid_to && !isNaN(new Date(newOffer.valid_to).getTime())
                        ? new Date(newOffer.valid_to)
                        : new Date()
                    }
                    mode="date"
                    display="default"
                    onChange={handleValidToChange}
                    minimumDate={newOffer.valid_from ? new Date(newOffer.valid_from) : undefined}
                  />
                )}
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Active *</Text>
                <View style={styles.selectContainer}>
                  <Picker
                    style={{ height: 70, justifyContent: 'center' }}
                    selectedValue={newOffer.is_active}
                    onValueChange={(value) => setNewOffer({ ...newOffer, is_active: value })}
         
                  >
                    {SelectAvailability.map((item) => (
                      <Picker.Item key={item.key} label={item.value} value={item.value} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.submitButton} onPress={handleAddOffer}>
                  <Text style={styles.buttonText}>{isEditing ? 'Update Offer' : 'Add Offer'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, styles.cancelButton]}
                  onPress={() => {
                    setNewOffer({
                      title: '',
                      description: '',
                      discount_type: 'flat',
                      discount_value: '',
                      valid_from: '',
                      valid_to: '',
                      is_active: 'No',
                    });
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

        {/* Send Offer Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={sendModalVisible}
          onRequestClose={() => {
            setSendModalVisible(false);
            setSelectedRecipients([]);
            setCustomerSearch('');
            setSelectAllCustomers(false);
            setCurrentOffer(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Send Offer: {currentOffer?.title || ''}
              </Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>SMS Preview</Text>
                <View style={styles.smsPreview}>
                  <Text>
                    {currentOffer?.title} - {currentOffer?.discount_value}
                    {currentOffer?.discount_type === 'percentage' ? '%' : ''} OFF. Valid till{' '}
                    {currentOffer?.valid_to}.
                  </Text>
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Select Recipient Type</Text>
                <View style={styles.selectContainer}>
                  <Picker
                    style={{ height: 90, justifyContent: 'center' }}
                    selectedValue={recipientType}
                    onValueChange={(value) => {
                      setRecipientType(value);
                      setSelectedRecipients([]);
                      setCustomerSearch('');
                      setSelectAllCustomers(false);
                    }}

                  >
                    <Picker.Item label="Customers" value="customers" />
                    <Picker.Item label="Employees" value="employees" />
                  </Picker>
                </View>
              </View>
              {recipientType === 'customers' && (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Select Customers</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Search customers..."
                    placeholderTextColor="#151515ff"
                    value={customerSearch}
                    onChangeText={handleCustomerSearch}
                  />
                  <View style={styles.customerListWrapper}>
                    <TouchableOpacity
                      style={styles.selectAllContainer}
                      onPress={handleSelectAllCustomers}
                    >
                      <Icon
                        name={selectAllCustomers ? 'check-square-o' : 'square-o'}
                        size={20}
                        color="#333"
                      />
                      <Text style={styles.selectAllLabel}>Select All</Text>
                    </TouchableOpacity>
                    <FlatList
                      data={customers}
                      renderItem={renderCustomerItem}
                      keyExtractor={(item) => item.id.toString()}
                      style={styles.customerList}
                    />
                  </View>
                </View>
              )}
             
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSendOfferSubmit}
                >
                  <Text style={styles.buttonText}>Send Offer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, styles.cancelButton]}
                  onPress={() => {
                    setSendModalVisible(false);
                    setSelectedRecipients([]);
                    setCustomerSearch('');
                    setSelectAllCustomers(false);
                    setCurrentOffer(null);
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
    margin: 20,
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
  multiSelectContainer: {
    minHeight: 150,
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
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: '#6a11cb',
    marginHorizontal: 5,
  },
  activePageButton: {
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
  activePageText: {
    fontWeight: 'bold',
  },
  smsPreview: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  customerListWrapper: {
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectAllLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  customerList: {
    flexGrow: 0,
  },
  customerItem: {
    marginBottom: 8,
  },
  customerCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
});