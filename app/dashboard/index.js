import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl, // Add this for pull-to-refresh
} from "react-native";
import { useDrawerStatus } from "expo-router/drawer";

import Card from "../../components/common/Card";
import { useEffect, useState } from "react";
import axios from "axios";
import { config } from "@/config/config";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
// Get screen width for responsive charts
const screenWidth = Dimensions.get("window").width;

export default function Dashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    totalClients: 0,
    totalPricings: 0,
    totalUsers: 0,
  });
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [offers, setOffers] = useState([]);
  const [bookingTrendData, setBookingTrendData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  });
  const [bookingStatusData, setBookingStatusData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null); // Add state for token
  const [refreshing, setRefreshing] = useState(false); // Add for pull-to-refresh

  // Separate effect to fetch token once on mount (handles async AsyncStorage)
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(
          config.STORAGE_KEYS.AUTH_TOKEN
        );
        setToken(storedToken);
      } catch (err) {
        console.error("Failed to load token:", err);
        setToken(null);
      }
    };

    loadToken();
  }, []); // Empty dependency: runs only once on mount

  // Main fetch effect: depends on token. Runs when token is available (initial load or after login)
  useEffect(() => {
    if (!token) {
      setLoading(false); // Stop loading if no token (will retry when token is set)
      setError("No auth token found. Please log in.");
      return;
    }

    fetchData();
  }, [token]); // Dependency on token: re-runs when token changes (e.g., after login)

  const fetchData = async () => {
    if (refreshing) return; // Prevent concurrent fetches during refresh
    try {
      setLoading(true);
      setError(null);

      // Fetch analytics data
      const analyticsResponse = await axios.get(
        `${config.BASE_URL}${config.API_ENDPOINTS.LOCALDATA.ANALYTICS}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const analyticsData = analyticsResponse?.data?.data || {};

      setAnalytics({
        totalBookings: analyticsData.totalBookings || 0,
        totalClients: analyticsData.totalClients || 0,
        totalPricings: analyticsData.totalPricings || 0,
        totalUsers: analyticsData.totalUsers || 0,
      });

      // Fetch bookings
      const bookingsResponse = await axios.get(
        `${config.BASE_URL}${config.API_ENDPOINTS.LOCALDATA.HOMEPAGE}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const bookingsData = bookingsResponse?.data?.data || [];

     

      const todayNew = new Date();

      if (!todayNew || isNaN(todayNew.getTime())) {
        console.error("Invalid date for today", todayNew);
        return; // Exit if date is invalid
      }

      todayNew.setHours(0, 0, 0, 0); // Reset time to midnight
      const fiveDaysLater = new Date(todayNew);
      fiveDaysLater.setDate(todayNew.getDate() + 1);
      //  console.log("Fetched bookingsData:", fiveDaysLater);

    
      // console.log("recentBookings", recentBookings);
      setBookings(bookingsData);

      // Fetch offers
      const offersResponse = await axios.get(
        `${config.BASE_URL}${config.API_ENDPOINTS.LOCALDATA.EXPIRY_TABLE}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setOffers(offersResponse?.data?.data || []);

      // Process LineChart data (Weekly Booking Trends)
      const trendData = Array(7).fill(0); // Initialize with zeros for each day
      const today = new Date();
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      bookingsData.forEach((booking) => {
        const bookingDate = new Date(booking.date);
        const dayIndex = bookingDate.getDay();
        if (bookingDate >= startOfWeek) {
          trendData[dayIndex] += 1;
        }
      });

      setBookingTrendData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          {
            data: trendData,
            color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`, // Green
            strokeWidth: 2,
          },
        ],
      });

      // Process PieChart data (Booking Status Distribution)
      const statusCounts = bookingsData.reduce(
        (acc, booking) => {
          const status = booking?.status || "Unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        { Pending: 0, Confirmed: 0, Cancelled: 0, Unknown: 0 }
      );

      const statusData = [
        {
          name: "Pending",
          count: statusCounts.Pending,
          color: "#FBBF24",
          legendFontColor: "#333",
          legendFontSize: 14,
        },
        {
          name: "Confirmed",
          count: statusCounts.Confirmed,
          color: "#34D399",
          legendFontColor: "#333",
          legendFontSize: 14,
        },
        {
          name: "Cancelled",
          count: statusCounts.Cancelled,
          color: "#F87171",
          legendFontColor: "#333",
          legendFontSize: 14,
        },
        ...(statusCounts.Unknown > 0
          ? [
              {
                name: "Unknown",
                count: statusCounts.Unknown,
                color: "#9CA3AF",
                legendFontColor: "#333",
                legendFontSize: 14,
              },
            ]
          : []),
      ].filter((item) => item.count > 0);

      setBookingStatusData(statusData);
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh handler (for pull-to-refresh or button)
  const onRefresh = async () => {
    setRefreshing(true);
    // Re-fetch token in case it changed
    try {
      const storedToken = await AsyncStorage.getItem(
        config.STORAGE_KEYS.AUTH_TOKEN
      );
      setToken(storedToken);
    } catch (err) {
      console.error("Failed to refresh token:", err);
    }
    setRefreshing(false);
  };

  const renderBookingItem = ({ item }) => {
    // Format the date and time
    const bookingDate = new Date(item.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const startTime = item.start_time || "N/A";
    const endTime = item.end_time || "N/A";
    const duration = item.duration ? `${item.duration} min` : "N/A";
    const services = item.sub_category || "N/A";

    // Status color mapping
    const statusColors = {
      Confirmed: "#34D399",
      Pending: "#FBBF24",
      Cancelled: "#F87171",
    };
    const statusColor = statusColors[item.status] || "#9CA3AF";

    return (
      <TouchableOpacity
        style={[styles.bookingCard, { borderLeftColor: statusColor }]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#4B5563" />
            <Text style={styles.infoText}>{bookingDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#4B5563" />
            <Text
              style={styles.infoText}
            >{`${startTime} - ${endTime} (${duration})`}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cut-outline" size={16} color="#4B5563" />
            <Text style={styles.infoText}>{services}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color="#4B5563" />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#4B5563" />
            <Text style={styles.infoText}>{item.email}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // If no token and error, provide a login redirect button
  if (error && !token) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')} // Adjust path to your login screen
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      } // Add pull-to-refresh
    >
      <View style={styles.innerContainer}>
        {loading && <Text style={styles.loadingText}>Loading...</Text>}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsContainer}>
          <Card
            title="Total Bookings"
            value={analytics.totalBookings}
            description={`Pending: ${
              bookings.filter((b) => b.status === "Pending").length
            }`}
            style={styles.card}
            icon="📅"
            navigateTo="/bookings"
          />
          <Card
            title="Total Clients"
            value={analytics.totalClients}
            description="New this week: 0" // Update logic if API provides
            style={styles.card}
            icon="👥"
            navigateTo="/clients"
          />
          <Card
            title="Services Offered"
            value={analytics.totalPricings}
            description="Active services"
            style={styles.card}
            icon="💇‍♀️"
            navigateTo="/services"
          />
          <Card
            title="Staff Members"
            value={analytics.totalUsers}
            description="On leave: 0" // Update logic if API provides
            style={styles.card}
            icon="👩‍💼"
            navigateTo="/users"
          />
        </View>

        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        <FlatList
          data={bookings.slice(0, 3)}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f3ff",
  },
  innerContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  // ... (existing styles unchanged)
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 5,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: (screenWidth - 56) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1f2937",
    marginVertical: 16,
  },
  list: {
    marginBottom: 20,
  },
  bookingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4, // Colored border for status
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
    textTransform: "uppercase",
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#4B5563",
  },
  loadingText: {
    fontSize: 16,
    color: "#1f2937",
    textAlign: "center",
    marginVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#F87171",
    textAlign: "center",
    marginVertical: 10,
  },
  // Add new styles for error handling and refresh
  center: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  retryButton: {
    backgroundColor: "#34D399",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});