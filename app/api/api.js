// api/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../../config/config';

// Helper function to get the XSRF-TOKEN from AsyncStorage or response
const getCsrfToken = async () => {
  try {
    // Attempt to fetch the CSRF cookie
    const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.CSRF_COOKIE}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF cookie');
    }

    // Extract XSRF-TOKEN from cookies (React Native may not directly access cookies)
    // Alternatively, store the token in AsyncStorage if your backend provides it
    const cookies = response.headers.get('set-cookie');
    let xsrfToken = null;
    if (cookies) {
      const match = cookies.match(/XSRF-TOKEN=([^;]+)/);
      if (match) {
        xsrfToken = decodeURIComponent(match[1]); // Decode the token
      }
    }
    return xsrfToken;
  } catch (error) {
    console.error('Error fetching CSRF cookie:', error);
    throw error;
  }
};

// Update booking status
const updateStatus = async (id, status) => {
  try {
    const xsrfToken = await getCsrfToken(); // Get the CSRF token
    const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);

    const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.LOCALDATA.UPDATE_STATUS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-XSRF-TOKEN': xsrfToken, // Include the CSRF token in the header
      },
      credentials: 'include',
      body: JSON.stringify({ id, status }),
    });

    const data = await response.json();
    if (data.success) {
      Alert.alert('Success', `Booking ${status.toLowerCase()} successfully!`);
      fetchBookings(filter); // Refresh bookings after status update
    } else {
      Alert.alert('Error', data.message || `Failed to ${status.toLowerCase()} booking.`);
    }
  } catch (error) {
    console.error(`Update status (${status}) error:`, error);
    Alert.alert('Error', `An error occurred while updating the booking status. Please try again.`);
  }
};

export const checkSlotAvailability = async (date, duration) => {
  try {
    // await getCsrfToken();
    const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
    // console.log('token',token)
    const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.CHECK_SLOT_AVAILABILITY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({ date, duration }),
    });
    const data = await response.json();
    // console.log('datas',data)
    
    return data;
  } catch (error) {
    // throw new Error('Error checking slot availability: ' + error.message);
  }
};

export const getServices = async () => {
  try {
    const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.SERVICES.forbooking}`, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    });
    
    // console.log('getServices',await response.json())
    return await response.json();
  } catch (error) {

    throw error;
  }
};

export const storeBooking = async (bookingData) => {
  try {
    // await getCsrfToken();
    const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
    const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.LOCALDATA.STORE_BOOKING}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify(bookingData),
    });
    const data = await response.json();
    // console.log(bookingData)
    // console.log('data',data)
    if (!data.success) {
      throw new Error(data.message || 'Failed to store booking');
    }
    return data;
  } catch (error) {
    throw new Error('Error storing booking: ' + error.message);
  }
};