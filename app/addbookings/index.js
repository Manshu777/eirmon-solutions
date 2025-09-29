import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment-timezone';
import { useNavigation, useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import { checkSlotAvailability, storeBooking, getServices } from '../api/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddBooking() {
const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState([]);
  const [serviceCategories, setServiceCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceDurations, setServiceDurations] = useState({});
  const [servicePrices, setServicePrices] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const loadServices = async () => {
      try {
        setIsLoading(true);
        const data = await getServices();
        const validCategories = Object.keys(data.categories || {}).filter(
          (key) => key && data.categories[key]?.length > 0
        );
        setCategories(validCategories.map((c) => ({ key: c, value: c })));
        setServiceCategories(data.categories || {});
        setServiceDurations(data.serviceDurations || {});
        setServicePrices(data.servicePrices || {});
      } catch (err) {
        Alert.alert('Error', 'Failed to load services. Using fallback.');
        setCategories([{ key: 'General', value: 'General' }]);
        setServiceCategories({ General: ['Haircut', 'Manicure'] });
        setServiceDurations({ Haircut: '30 minutes', Manicure: '45 minutes' });
      } finally {
        setIsLoading(false);
      }
    };
    loadServices();
  }, []);

  const calculateTotalDuration = () => {
    if (selectedServices.length === 0) return 30;
    return selectedServices.reduce((total, service) => {
      const d = serviceDurations[service] || '30 minutes';
      const minutes = parseInt(d.replace(' minutes', '')) || 30;
      return total + minutes;
    }, 0);
  };

  const calculateTotalPrice = () => {
    return selectedServices.reduce((total, service) => {
      const price = parseFloat(servicePrices[service]) || 0;
      return total + price;
    }, 0).toFixed(2);
  };

  const calculateEndTime = (startTime, duration) => {
    const start = moment(startTime, 'HH:mm');
    return start.add(duration, 'minutes').format('HH:mm');
  };

  const fetchTimeSlots = async (date) => {
    try {
      setIsLoading(true);
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const response = await checkSlotAvailability(formattedDate, calculateTotalDuration());
      setAvailableSlots(response.availableSlots || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!userName || !userEmail || !userPhone || !selectedTime) {
      Alert.alert('Error', 'Please fill all required fields (Name, Email, Phone, Time).');
      return;
    }
    try {
      setIsLoading(true);
      const totalDuration = calculateTotalDuration();
      const bookingData = {
        name: userName,
        email: userEmail,
        phone: userPhone,
        date: moment(selectedDate).format('YYYY-MM-DD'),
        time: selectedTime,
        start_time: selectedTime,
        end_time: calculateEndTime(selectedTime, totalDuration),
        duration: totalDuration,
        services: selectedServices.join(', '),
        status: 'Confirmed',
        total_price: calculateTotalPrice(),
        notes: bookingNotes || null,
      };
      const res = await storeBooking(bookingData);
      if (res.success) setModalVisible(true);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <>
 <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.header}>Add Booking</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.innerContainer}>
          {/* STEP 1: Category + Services */}
          {step === 1 && (
            <View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Select a Category *</Text>
                <View style={styles.selectContainer}>
                  <Picker
                    selectedValue={selectedCategory}
                    onValueChange={(value) => setSelectedCategory(value)}
                    style={{ height: 90, justifyContent: 'center' }}
                  >
                    <Picker.Item label="Choose Category" value="" />
                    {categories.map((category) => (
                      <Picker.Item key={category.key} label={category.value} value={category.value} />
                    ))}
                  </Picker>
                </View>
              </View>
              {selectedCategory && (
                <>
                  <Text style={styles.subHeader}>Select Services</Text>
                  <ScrollView style={styles.servicesScrollView}>
                    {(serviceCategories[selectedCategory] || []).map((service) => {
                      const isSelected = selectedServices.includes(service);
                      return (
                        <TouchableOpacity
                          key={service}
                          style={[styles.slot, isSelected && styles.selectedSlot]}
                          onPress={() => {
                            setSelectedServices((prev) =>
                              isSelected ? prev.filter((s) => s !== service) : [...prev, service]
                            );
                          }}
                        >
                          <Text style={{ color: isSelected ? '#000' : '#000' }}>
                            {service} - {servicePrices[service] || '0.00'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {selectedServices.length > 0 && (
                    <View style={styles.selectedServicesContainer}>
                      <Text style={styles.subHeader}>Selected Services</Text>
                      <ScrollView style={styles.selectedServicesScrollView}>
                        {selectedServices.map((service) => (
                          <View key={service} style={styles.selectedServiceItem}>
                            <Text style={styles.selectedServiceText}>
                              {service} - {serviceDurations[service]} - {servicePrices[service] || '0.00'}
                            </Text>
                            <TouchableOpacity
                              style={styles.cancelServiceBtn}
                              onPress={() => {
                                setSelectedServices((prev) => prev.filter((s) => s !== service));
                              }}
                            >
                              <Text style={styles.cancelServiceText}>X</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.cancelButton, { flex: 1, marginHorizontal: 5 }]}
                  onPress={handleBack}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginHorizontal: 5 }, (!selectedCategory || selectedServices.length === 0) && styles.disabled]}
                  onPress={() => setStep(2)}
                  disabled={!selectedCategory || selectedServices.length === 0}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 2: Date */}
          {step === 2 && (
            <View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Select a Date *</Text>
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {moment(selectedDate).format('DD MMM YYYY')}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      if (event.type === 'set' && date) {
                        setSelectedDate(date);
                        fetchTimeSlots(date);
                      }
                      setShowDatePicker(false);
                    }}
                  />
                )}
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.cancelButton, { flex: 1, marginHorizontal: 5 }]}
                  onPress={handleBack}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginHorizontal: 5 }]}
                  onPress={() => setStep(3)}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: Time */}
          {step === 3 && (
            <View>
              <Text style={styles.subHeader}>Select a Time</Text>
              {isLoading ? (
                <ActivityIndicator size="large" color="#6a11cb" />
              ) : availableSlots.length > 0 ? (
                <ScrollView style={styles.timeSlotScrollView}>
                  <View style={styles.timeSlotContainer}>
                    {availableSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.slot, styles.timeSlot, selectedTime === slot && styles.selectedSlot]}
                        onPress={() => setSelectedTime(slot)}
                      >
                        <Text style={selectedTime === slot ? styles.selectedSlotText : styles.slotText}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={styles.noDataText}>No slots available</Text>
              )}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.cancelButton, { flex: 1, marginHorizontal: 5 }]}
                  onPress={handleBack}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginHorizontal: 5 }, !selectedTime && styles.disabled]}
                  onPress={() => setStep(4)}
                  disabled={!selectedTime}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: User Details + Summary */}
          {step === 4 && (
            <View>
              <ScrollView style={styles.booksumery}>
              <Text style={styles.subHeader}>Booking Summary</Text>
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>Date: {moment(selectedDate).format('DD MMM YYYY')}</Text>
                <Text style={styles.summaryText}>Time: {selectedTime}</Text>
                <Text style={styles.summaryText}>Duration: {calculateTotalDuration()} minutes</Text>
                <Text style={styles.summaryText}>Total Price: {calculateTotalPrice()}</Text>
                <Text style={styles.summaryText}>Services:</Text>
                {selectedServices.map((service) => (
                  <Text key={service} style={styles.summaryService}>
                    • {service} ({servicePrices[service] || '0.00'})
                  </Text>
                ))}
               
              </View>
               </ScrollView>
              <Text style={styles.subHeader}>Your Details</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter Name"
                  placeholderTextColor="#151515ff"
                  value={userName}
                  onChangeText={setUserName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter Email"
                  placeholderTextColor="#151515ff"
                  value={userEmail}
                  onChangeText={setUserEmail}
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Phone *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter Phone"
                  placeholderTextColor="#151515ff"
                  value={userPhone}
                  onChangeText={setUserPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, { height: 80 }]}
                  placeholder="Enter Notes (optional)"
                  placeholderTextColor="#151515ff"
                  value={bookingNotes}
                  onChangeText={setBookingNotes}
                  multiline
                />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.cancelButton, { flex: 1, marginHorizontal: 5 }]}
                  onPress={handleBack}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginHorizontal: 5 }]}
                  onPress={handleConfirmBooking}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Confirm Booking</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SUCCESS MODAL */}
          <Modal visible={modalVisible} transparent animationType="fade">
            <View style={styles.modal}>
              <View style={styles.modalContent}>
                <Icon name="check-circle" size={48} color="#6a11cb" style={styles.modalIcon} />
                <Text style={styles.modalTitle}>Booking Confirmed!</Text>
                <Text style={styles.modalText}>Your booking has been successfully created.</Text>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => {
                    setModalVisible(false);
                    router.push('/dashboard');
                  }}
                >
                  <Text style={styles.buttonText}>Go to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
    </>

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
  innerContainer: {
    flex: 1,
    padding: 20,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginVertical: 10,
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
  submitButton: {
    backgroundColor: '#6a11cb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabled: {
    backgroundColor: '#ccc',
  },
  slot: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginVertical: 5,
  },
  selectedSlot: {
    borderColor: '#6a11cb',
    borderWidth: 1,
    borderLeftWidth: 6,
    backgroundColor: '#f5f3ff',
  },
  selectedSlotText: {
    color: '#000',
    fontWeight: '600',
  },
  slotText: {
    color: '#000',
  },

  booksumery:{
        maxHeight: 150,
    marginBottom: 15,
  },


  timeSlotScrollView: {
    maxHeight: 200,
    marginBottom: 15,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: '48%',
  },
  servicesScrollView: {
    maxHeight: 200,
    marginBottom: 15,
  },
  selectedServicesContainer: {
    margin: 15,
    borderWidth: 2,
    borderStyle: 'dotted',
    borderColor: '#6a11cb',
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    padding: 10,
  },
  selectedServicesScrollView: {
    maxHeight: 150,
  },
  selectedServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  selectedServiceText: {
    flex: 1,
    fontSize: 14,
  },
  cancelServiceBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelServiceText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  summaryService: {
    fontSize: 14,
    marginLeft: 10,
    marginBottom: 3,
    color: '#333',
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '80%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#6a11cb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
});