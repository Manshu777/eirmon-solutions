// components/AddBooking.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment-timezone';
import { useNavigation } from 'expo-router';
import { checkSlotAvailability, storeBooking } from '../api/api';

// Hardcoded categories and durations (replace with API call if needed)
const categories = {
  Hair: ['Haircut', 'Hair Color', 'Hair Styling'],
  Nails: ['Manicure', 'Pedicure'],
  Makeup: ['Full Makeup', 'Bridal Makeup'],
};

const serviceDurations = {
  Haircut: '30 minutes',
  'Hair Color': '60 minutes',
  'Hair Styling': '45 minutes',
  Manicure: '45 minutes',
  Pedicure: '45 minutes',
  'Full Makeup': '60 minutes',
  'Bridal Makeup': '90 minutes',
};

export default function AddBooking() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedServices, setSelectedServices] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const timezone = 'Australia/Melbourne';

  // Calculate total duration of selected services
  const calculateTotalDuration = () => {
    let totalDuration = 0;
    Object.values(selectedServices)
      .flat()
      .forEach((service) => {
        const durationText = serviceDurations[service] || '30 minutes';
        totalDuration += parseInt(durationText.replace(' minutes', ''));
      });
    return totalDuration;
  };

  // Fetch available time slots
  const fetchTimeSlots = async (date) => {
    setIsLoading(true);
    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const duration = calculateTotalDuration();
      const response = await checkSlotAvailability(formattedDate, duration);
      setAvailableSlots(response.availableSlots || []);
      setUnavailableSlots(response.unavailableSlots || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle category selection
  const selectCategory = (category) => {
    setSelectedCategory(category);
  };

  // Handle service selection
  const toggleService = (category, service) => {
    setSelectedServices((prev) => {
      const newServices = { ...prev };
      if (!newServices[category]) newServices[category] = [];
      if (newServices[category].includes(service)) {
        newServices[category] = newServices[category].filter((s) => s !== service);
      } else {
        newServices[category].push(service);
      }
      if (newServices[category].length === 0) delete newServices[category];
      return newServices;
    });
    setSelectedTime(''); // Reset time when services change
    fetchTimeSlots(selectedDate); // Refresh slots
  };

  // Handle time slot selection
  const handleSlotSelection = (slot) => {
    const totalDuration = calculateTotalDuration();
    const slotIndex = availableSlots.indexOf(slot);
    const totalSlotsNeeded = Math.ceil(totalDuration / 30);

    let slotsAvailable = true;
    for (let i = 0; i < totalSlotsNeeded; i++) {
      if (!availableSlots[slotIndex + i] || unavailableSlots.includes(availableSlots[slotIndex + i])) {
        slotsAvailable = false;
        break;
      }
    }

    if (!slotsAvailable) {
      Alert.alert('Error', 'Selected time slot or subsequent slots are not available.');
      return;
    }

    setSelectedTime(slot);
  };

  // Handle booking submission
  const handleConfirmBooking = async () => {
    if (!userName || !userEmail || !userPhone || !selectedTime || !Object.values(selectedServices).flat().length) {
      Alert.alert('Error', 'Please fill all required fields and select a service and time.');
      return;
    }

    setIsLoading(true);
    const allServices = Object.values(selectedServices).flat().join(', ');
    const totalDuration = calculateTotalDuration();
    const [startHour, startMinute] = selectedTime.split(':').map(Number);
    const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    let endHour = startHour;
    let endMinute = startMinute + totalDuration;
    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60);
      endMinute = endMinute % 60;
    }
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    const bookingData = {
      name: userName,
      email: userEmail,
      phone: userPhone,
      date: moment(selectedDate).format('YYYY-MM-DD'),
      time: startTime,
      start_time: startTime,
      end_time: endTime,
      duration: totalDuration,
      services: allServices,
      notes: bookingNotes,
    };

    try {
      const response = await storeBooking(bookingData);
      if (response.success) {
        setModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch time slots when date or services change
  useEffect(() => {
    fetchTimeSlots(selectedDate);
  }, [selectedDate, selectedServices]);

  // Render category item
  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.filterButton, selectedCategory === item && styles.filterButtonActive]}
      onPress={() => selectCategory(item)}
    >
      <Text style={[styles.filterText, selectedCategory === item && styles.filterTextActive]}>{item}</Text>
    </TouchableOpacity>
  );

  // Render service item
  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, selectedServices[selectedCategory]?.includes(item) && styles.selectedService]}
      onPress={() => toggleService(selectedCategory, item)}
    >
      <Text style={styles.cardTitle}>{item}</Text>
      <Text style={styles.value}>{serviceDurations[item]}</Text>
    </TouchableOpacity>
  );

  // Render time slot item
  const renderTimeSlot = ({ item }) => {
    const isFullyBooked = unavailableSlots.includes(item);
    const isSelected = selectedTime === item;
    const startTime = moment.tz(`${moment(selectedDate).format('YYYY-MM-DD')} ${item}`, 'YYYY-MM-DD HH:mm', timezone);
    const endTime = startTime.clone().add(30, 'minutes');

    return (
      <TouchableOpacity
        style={[styles.timeSlotButton, isFullyBooked && styles.fullyBooked, isSelected && styles.selectedSlot]}
        onPress={() => handleSlotSelection(item)}
        disabled={isFullyBooked}
      >
        <Text style={styles.value}>
          {startTime.format('h:mm A')} - {endTime.format('h:mm A')}
        </Text>
      </TouchableOpacity>
    );
  };

  const allServices = Object.values(selectedServices).flat();
  const formattedDate = moment(selectedDate).format('dddd, MMMM D, YYYY');
  const startTime = selectedTime
    ? moment.tz(`${moment(selectedDate).format('YYYY-MM-DD')} ${selectedTime}`, 'YYYY-MM-DD HH:mm', timezone)
    : null;
  const endTime = startTime ? startTime.clone().add(calculateTotalDuration(), 'minutes') : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
      <ScrollView style={styles.innerContainer}>
        <Text style={styles.header}>Add New Booking</Text>

        {/* Service Selection */}
        <Text style={styles.subHeader}>Select Services</Text>
        <FlatList
          data={Object.keys(categories)}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item}
          horizontal
          style={styles.filterContainer}
        />
        {selectedCategory ? (
          <FlatList
            data={categories[selectedCategory]}
            renderItem={renderServiceItem}
            keyExtractor={(item) => item}
            style={styles.list}
          />
        ) : (
          <Text style={styles.noDataText}>Please select a category</Text>
        )}
        {allServices.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.subHeader}>Selected Services</Text>
            {allServices.map((service, index) => (
              <Text key={index} style={styles.value}>
                {service} <Text onPress={() => toggleService(selectedCategory, service)}>×</Text>
              </Text>
            ))}
          </View>
        )}

        {/* Date and Time Selection */}
        <Text style={styles.subHeader}>Choose Date & Time</Text>
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="inline"
          minimumDate={new Date()}
          onChange={(event, date) => setSelectedDate(date || new Date())}
          style={styles.datePicker}
        />
        <Text style={styles.subHeader}>Available Time Slots</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#6a11cb" />
        ) : availableSlots.length > 0 ? (
          <FlatList
            data={availableSlots}
            renderItem={renderTimeSlot}
            keyExtractor={(item) => item}
            numColumns={3}
            style={styles.list}
          />
        ) : (
          <Text style={styles.noDataText}>No slots available for selected date.</Text>
        )}

        {/* User Details */}
        <Text style={styles.subHeader}>Your Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Your Name"

          placeholderTextColor="#151515ff"
          value={userName}
          onChangeText={setUserName}
        />
        <TextInput
          style={styles.input}
          placeholder="Your Email"
          placeholderTextColor="#151515ff"
          value={userEmail}
          onChangeText={setUserEmail}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Your Phone Number"
          placeholderTextColor="#151515ff"
          value={userPhone}
          onChangeText={setUserPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Special requests or notes (optional)"
          placeholderTextColor="#151515ff"
          value={bookingNotes}
          onChangeText={setBookingNotes}
          multiline
        />

        {/* Confirmation Summary */}
        {allServices.length > 0 && selectedTime && (
          <View style={styles.card}>
            <Text style={styles.subHeader}>Booking Summary</Text>
            <Text style={styles.value}>Services: {allServices.join(', ')}</Text>
            <Text style={styles.value}>
              Date: {formattedDate}
            </Text>
            <Text style={styles.value}>
              Time: {startTime?.format('h:mm A')} - {endTime?.format('h:mm A')}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, (!selectedTime || !allServices.length) && styles.disabledButton]}
            onPress={handleConfirmBooking}
            disabled={isLoading || !selectedTime || !allServices.length}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.header}>Booking Confirmed!</Text>
            <Text style={styles.value}>Your appointment has been successfully scheduled.</Text>
            <Text style={styles.value}>
              {formattedDate} at {startTime?.format('h:mm A')} - {endTime?.format('h:mm A')}
            </Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('BookingsIndex');
              }}
            >
              <Text style={styles.actionText}>Return to Bookings</Text>
            </TouchableOpacity>
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
  innerContainer: {
    flex: 1,
    padding: 20,
  },
  menuButton: {
    padding: 15,
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
  },
  menuIcon: {
    fontSize: 24,
    color: '#333',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginVertical: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: '#ddd',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#6a11cb',
  },
  filterText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
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
  selectedService: {
    backgroundColor: '#e0e0e0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6a11cb',
    marginBottom: 10,
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  timeSlotButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    margin: 5,
    flex: 1,
  },
  fullyBooked: {
    backgroundColor: '#ff4d4d',
    opacity: 0.8,
  },
  selectedSlot: {
    backgroundColor: '#28a745',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  confirmButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    marginBottom: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
  datePicker: {
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
});