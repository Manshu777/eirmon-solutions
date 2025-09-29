import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// List of routes based on your project structure
const routes = [
  { name: 'Home', path: '/index' },
  { name: 'Dashboard', path: '/dashboard/index' },
  { name: 'Login', path: '/login/index' },
  { name: 'Bookings', path: '/bookings/index' },
  { name: 'Clients', path: '/clients/index' },
  { name: 'Services', path: '/services/index' },
  { name: 'Users', path: '/users/index' },
  { name: 'Offers', path: '/offers/index' },
  { name: 'Add Bookings', path: '/addbookings/index' },
  { name: 'Leaves', path: '/leaves/index' },
  { name: 'Logout', path: '/logout/index' },
  { name: 'Timeslot', path: '/timeslot/index' },
];

export default function Sitemap() {
  const router = useRouter();

  const handleRoutePress = (path) => {
    router.push(path);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sitemap</Text>
      <FlatList
        data={routes}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.routeItem}
            onPress={() => handleRoutePress(item.path)}
          >
            <Text style={styles.routeName}>{item.name}</Text>
            <Text style={styles.routePath}>{item.path}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  routeItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeName: {
    fontSize: 18,
    color: '#007AFF',
  },
  routePath: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
});