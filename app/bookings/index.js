import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { config } from '../../config/config';

export default function BookingsIndex() {
  const navigation = useNavigation();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [chartData, setChartData] = useState([]);

  // Screen width for chart
  const screenWidth = Dimensions.get('window').width;

  // Prepare chart data based on bookings
  const prepareChartData = (bookingsData) => {
    const statusCounts = {
      Pending: 0,
      Confirmed: 0,
      Expired: 0,
      Cancelled: 0,
    };

    bookingsData.forEach((booking) => {
      if (statusCounts[booking.status] !== undefined) {
        statusCounts[booking.status]++;
      }
    });

    const colors = {
      Pending: '#ffc107',
      Confirmed: '#28a745',
      Expired: '#6b7280',
      Cancelled: '#ff4d4d',
    };

    const data = Object.keys(statusCounts)
      .filter((status) => statusCounts[status] > 0) // Only include statuses with bookings
      .map((status) => ({
        name: status,
        population: statusCounts[status],
        color: colors[status],
        legendFontColor: '#333',
        legendFontSize: 14,
      }));

    setChartData(data);
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

  // Fetch bookings from API
  const fetchBookings = async (status = 'All', search = '', pageNum = 1, append = false) => {
    if (pageNum > lastPage && pageNum !== 1) return;
    if (pageNum === 1) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        Alert.alert('Error', 'No auth token found. Please log in.');
        setIsLoading(false);
        setIsFetchingMore(false);
        return;
      }

      const url = new URL(`${config.BASE_URL}${config.API_ENDPOINTS.LOCALDATA.BOOKING_VIEW}`);
      if (status !== 'All') url.searchParams.append('status', status.toLowerCase());
      if (search) url.searchParams.append('search', search);
      url.searchParams.append('page', pageNum);
      url.searchParams.append('per_page', '10');

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
        const newBookings = append ? [...bookings, ...data.data] : data.data;
        setBookings(newBookings);

        setLastPage(data.pagination.last_page);
        setPage(pageNum);
        prepareChartData(newBookings); // Update chart data
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch bookings.');
        setBookings([]);
        setChartData([]);
      }
    } catch (error) {
      console.error('Fetch bookings error:', error);
      Alert.alert('Error', 'An error occurred while fetching bookings. Please try again.');
      setBookings([]);
      setChartData([]);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  // Update booking status
  const updateStatus = async (id, status) => {
    try {
      setIsLoading(true);
      await getCsrfCookie();
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
      const response = await fetch(`${config.BASE_URL}${config.API_ENDPOINTS.LOCALDATA.UPDATE_STATUS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ id, status }),
      });

      const data = await response.json();
      setIsLoading(false);
      if (data.success) {
        Alert.alert('Success', `Booking ${status.toLowerCase()} successfully!`);
        fetchBookings(filter, searchQuery, 1, false);
      } else {
        Alert.alert('Error', data.message || `Failed to ${status.toLowerCase()} booking.`);
      }
    } catch (error) {
      console.error(`Update status (${status}) error:`, error);
      Alert.alert('Error', 'An error occurred while updating the booking status. Please try again.');
    }
  };

  // Handle Confirm action
  const handleAction = (id) => {
    Alert.alert('Confirm Booking', `Are you sure you want to confirm booking ${id}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => updateStatus(id, 'Confirmed') },
    ]);
  };

  // Handle search input
  const handleSearch = (text) => {
    setSearchQuery(text);
    setPage(1);
    fetchBookings(filter, text, 1, false);
  };

  // Handle pagination (load more)
  const loadMoreBookings = () => {
    if (!isFetchingMore && page < lastPage) {
      fetchBookings(filter, searchQuery, page + 1, true);
    }
  };

  // Fetch bookings and prepare chart on mount and filter change
  useEffect(() => {
    setPage(1);
    fetchBookings(filter, searchQuery, 1, false);
  }, [filter]);

  const renderBookingItem = ({ item, index }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Booking #{item.id}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Sr No:</Text>
        <Text style={styles.value}>{index + 1}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{item.name}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Phone No:</Text>
        <Text style={styles.value}>{item.phone}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Service:</Text>
        <Text style={styles.value}>{item.sub_category}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Price:</Text>
        <Text style={styles.value}>${item.price}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{item.date}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Start Time:</Text>
        <Text style={styles.value}>{item.start_time}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>End Time:</Text>
        <Text style={styles.value}>{item.end_time}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Status:</Text>
        <Text
          style={[
            styles.value,
            item.status === 'Confirmed' ? styles.statusConfirmed :
            item.status === 'Pending' ? styles.statusPending :
            item.status === 'Cancelled' ? styles.statusCancelled :
            item.status === 'Expired' ? styles.statusExpired : styles.statusDefault,
          ]}
        >
          {item.status}
        </Text>
      </View>
      <View style={styles.actions}>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => handleAction(item.id)}
          >
            <Text style={styles.actionText}>Confirm</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const statuses = ['All', 'Pending', 'Confirmed', 'Expired'];
  // console.log('Render bookings with filter:', bookings, 'and searchQuery:', searchQuery);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.innerContainer}>
          {/* Pie Chart */}
        
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, or service..."
              placeholderTextColor="#151515ff"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleSearch('')}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Bar */}
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, filter === status && styles.filterButtonActive]}
                onPress={() => setFilter(status)}
              >
                <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6a11cb" />
            </View>
          ) : bookings.length === 0 ? (
            <Text style={styles.noDataText}>No bookings found.</Text>
          ) : (
            <FlatList
              data={bookings}
              renderItem={renderBookingItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.list}
              onEndReached={loadMoreBookings}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingMore ? (
                  <ActivityIndicator size="small" color="#6a11cb" style={styles.footerLoader} />
                ) : null
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    padding: 10,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#ddd',
    marginRight: 8,
    minWidth: 70,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6a11cb',
  },
  filterText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
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
  statusConfirmed: {
    color: '#28a745',
    fontWeight: '600',
  },
  statusPending: {
    color: '#ffc107',
    fontWeight: '600',
  },
  statusCancelled: {
    color: '#ff4d4d',
    fontWeight: '600',
  },
  statusExpired: {
    color: '#6b7280',
    fontWeight: '600',
  },
  statusDefault: {
    color: '#333',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    marginTop: 0,
    marginBottom: 20,
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
  footerLoader: {
    marginVertical: 20,
  },
});