import React, { useState, useEffect } from 'react';
import { View, Text, FlatList,  TouchableOpacity, Modal, Alert, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SelectList } from 'react-native-dropdown-select-list';
import { config } from '../../config/config';
import { SafeAreaView } from 'react-native-safe-area-context';

const BookingsIndex = () => {
  const navigation = useNavigation();
  const timeOptions = [
    "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
  ];

  const [timeSlots, setTimeSlots] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const perPage = 10;
  const [editId, setEditId] = useState(null);
  const [newTimeSlot, setNewTimeSlot] = useState({
    day: '',
    startTime: '',
    endTime: '',
  });

  const getCsrfCookie = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.CSRF_COOKIE}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF cookie');
      }
      const cookies = response.headers.get('set-cookie');
      const csrfToken = cookies?.match(/XSRF-TOKEN=([^;]+)/)?.[1];
      return csrfToken || '';
    } catch (error) {
      console.error('Error fetching CSRF cookie:', error);
      throw error;
    }
  };

  // Fetch time slots from API with pagination and search
  const fetchTimeSlots = async (page = 1, query = '') => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        throw new Error('No auth token found. Please log in.');
      }
      const url = new URL(`${config.BASE_URL}${config.API_ENDPOINTS.SALON_TIMES.INDEX}`);
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

      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      // console.log('API Response:', data);
      if (data.message === 'Salon time slots retrieved successfully.') {
        setTimeSlots(data.data || []);
        setTotalPages(data.last_page || 1);
        setCurrentPage(data.current_page || page);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch time slots.');
      }
    } catch (error) {
      console.error('Fetch time slots error:', error);
      Alert.alert(
        'Error',
        error.message === 'No auth token found. Please log in.'
          ? error.message
          : 'An error occurred while fetching time slots. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearch = (text) => {
    setSearchQuery(text);
    setCurrentPage(1);
    fetchTimeSlots(1, text);
  };

  const handleAddTimeSlot = async () => {
    if (!newTimeSlot.day || !newTimeSlot.startTime || !newTimeSlot.endTime) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    // Validate that end time is after start time
    const startIndex = timeOptions.indexOf(newTimeSlot.startTime);
    const endIndex = timeOptions.indexOf(newTimeSlot.endTime);
    if (startIndex >= endIndex) {
      Alert.alert('Error', 'End time must be after start time.');
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const csrfToken = await getCsrfCookie();
      const method = isEditing ? 'PUT' : 'POST';
      const endpoint = isEditing
        ? config.API_ENDPOINTS.SALON_TIMES.UPDATE.replace('{id}', editId)
        : config.API_ENDPOINTS.SALON_TIMES.STORE;

      const response = await fetch(`${config.BASE_URL}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          day: newTimeSlot.day,
          start_time: newTimeSlot.startTime,
          end_time: newTimeSlot.endTime,
        }),
      });

      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message || 'Time slot saved successfully!');
        setNewTimeSlot({ day: '', startTime: '', endTime: '' });
        setModalVisible(false);
        setIsEditing(false);
        setEditId(null);
        fetchTimeSlots(currentPage, searchQuery);
      } else {
        Alert.alert('Error', data.message || 'Failed to save time slot.');
      }
    } catch (error) {
      console.error('Save time slot error:', error);
      Alert.alert('Error', 'An error occurred while saving the time slot. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTimeSlot = async (id) => {
    Alert.alert('Delete Time Slot', `Are you sure you want to delete time slot ${id}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
            const csrfToken = await getCsrfCookie();
            const endpoint = config.API_ENDPOINTS.SALON_TIMES.DESTROY.replace('{id}', id);
            const response = await fetch(`${config.BASE_URL}${endpoint}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-CSRF-TOKEN': csrfToken,
              },
              credentials: 'include',
            });

            if (response.status === 401) {
              Alert.alert('Session Expired', 'Please log in again.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') },
              ]);
              return;
            }

            const data = await response.json();
            if (response.ok) {
              Alert.alert('Success', data.message || 'Time slot deleted successfully!');
              fetchTimeSlots(currentPage, searchQuery);
            } else {
              Alert.alert('Error', data.message || 'Failed to delete time slot.');
            }
          } catch (error) {
            console.error('Delete time slot error:', error);
            Alert.alert('Error', 'An error occurred while deleting the time slot. Please try again.');
          }
        },
      },
    ]);
  };

  const handleEditTimeSlot = (item) => {
    setNewTimeSlot({
      day: item.day,
      startTime: item.start_time,
      endTime: item.end_time,
    });
    setEditId(item.id);
    setIsEditing(true);
    setModalVisible(true);
  };

  // Fetch time slots on mount and when page or search changes
  useEffect(() => {
    fetchTimeSlots(currentPage, searchQuery);
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
          style={[
            styles.paginationButton,
            currentPage === i ? styles.activePageButton : null,
          ]}
          onPress={() => setCurrentPage(i)}
        >
          <Text style={[
            styles.paginationText,
            currentPage === i ? styles.activePageText : null,
          ]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return pageNumbers;
  };

  const renderBookingItem = ({ item, index }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Time Slot #{item.id}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Sr No:</Text>
        <Text style={styles.value}>{(currentPage - 1) * perPage + index + 1}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Day:</Text>
        <Text style={styles.value}>{item.day}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Start Time:</Text>
        <Text style={styles.value}>{item.start_time}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>End Time:</Text>
        <Text style={styles.value}>{item.end_time}</Text>
      </View>
      <View style={[styles.field, { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#6a11cb' }]}
          onPress={() => handleEditTimeSlot(item)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF4444', marginLeft: 10 }]}
          onPress={() => handleDeleteTimeSlot(item.id)}
        >
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.header}>Salon Time Slots</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <Icon name="plus" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search time slots by day..."
            placeholderTextColor="#151515ff"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        </View>

        <View style={styles.innerContainer}>
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#6a11cb" />
            </View>
          ) : timeSlots.length === 0 ? (
            <Text style={styles.noDataText}>No time slots found.</Text>
          ) : (
            <>
              <FlatList
                data={timeSlots}
                renderItem={renderBookingItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.list}
              />
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
                >
                  <Text style={styles.paginationText}>Previous</Text>
                </TouchableOpacity>
                <View style={styles.pageNumbersContainer}>
                  {renderPageNumbers()}
                </View>
                <TouchableOpacity
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
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
            setNewTimeSlot({ day: '', startTime: '', endTime: '' });
            setModalVisible(false);
            setIsEditing(false);
            setEditId(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Time Slot' : 'Add New Time Slot'}</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Day *</Text>
                <SelectList
                  placeholder="Select Day"
                  setSelected={(value) => setNewTimeSlot({ ...newTimeSlot, day: value })}
                  data={days.map((day) => ({ key: day, value: day }))}
                  save="value"
                  search={false}
                  defaultOption={newTimeSlot.day ? { key: newTimeSlot.day, value: newTimeSlot.day } : null}
                  boxStyles={styles.dropdown}
                  inputStyles={{ color: '#333' }}
                  dropdownStyles={styles.dropdown}
                  accessibilityLabel="Select day"
                  accessibilityHint="Choose a day for the time slot"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Start Time *</Text>
                <SelectList
                  placeholder="Select Start Time"
                  setSelected={(value) => setNewTimeSlot({ ...newTimeSlot, startTime: value })}
                  data={timeOptions.map((time) => ({ key: time, value: time }))}
                  save="value"
                  search={false}
                  defaultOption={
                    newTimeSlot.startTime ? { key: newTimeSlot.startTime, value: newTimeSlot.startTime } : null
                  }
                  boxStyles={styles.dropdown}
                  inputStyles={{ color: '#333' }}
                  dropdownStyles={styles.dropdown}
                  accessibilityLabel="Select start time"
                  accessibilityHint="Choose a start time for the time slot"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>End Time *</Text>
                <SelectList
                  placeholder="Select End Time"
                  setSelected={(value) => setNewTimeSlot({ ...newTimeSlot, endTime: value })}
                  data={timeOptions.map((time) => ({ key: time, value: time }))}
                  save="value"
                  search={false}
                  defaultOption={
                    newTimeSlot.endTime ? { key: newTimeSlot.endTime, value: newTimeSlot.endTime } : null
                  }
                  boxStyles={styles.dropdown}
                  inputStyles={{ color: '#333' }}
                  dropdownStyles={styles.dropdown}
                  accessibilityLabel="Select end time"
                  accessibilityHint="Choose an end time for the time slot"
                />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.formButton, { backgroundColor: '#6a11cb' }]}
                  onPress={handleAddTimeSlot}
                  disabled={isSaving}
                  accessibilityLabel={isEditing ? 'Update time slot' : 'Add time slot'}
                  accessibilityHint={isEditing ? 'Saves changes to the time slot' : 'Creates a new time slot'}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{isEditing ? 'Update Time Slot' : 'Add Time Slot'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, { backgroundColor: '#EF4444' }]}
                  onPress={() => {
                    setNewTimeSlot({ day: '', startTime: '', endTime: '' });
                    setModalVisible(false);
                    setIsEditing(false);
                    setEditId(null);
                  }}
                  disabled={isSaving}
                  accessibilityLabel="Cancel"
                  accessibilityHint="Closes the form without saving"
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
};

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
    marginTop: 10,
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
  dropdown: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    marginVertical: 5,
    borderRadius: 5,
  },
  formButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  loaderContainer: {
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
    marginHorizontal: 2,
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
});

export default BookingsIndex;