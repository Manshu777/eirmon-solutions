import { Stack, useRouter, usePathname } from 'expo-router';
import { AuthProvider, AuthContext } from '../contexts/AuthContext';
import { useContext, useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity, Text, View, StyleSheet,Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Dashboard from '../app/dashboard/index'

interface AuthContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { isLoggedIn, setIsLoggedIn } = useContext(AuthContext) as AuthContextType;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (router && pathname) {
      if (!isLoggedIn && pathname !== '/login' && pathname !== '/') {
        router.replace('/login');
      } else if (isLoggedIn && (pathname === '/login' || pathname === '/')) {
        router.replace('/dashboard');
      }
    }
  }, [isLoggedIn, pathname, router]);

const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      setIsLoggedIn(false);
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const CustomDrawerContent = () => {
     const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'home' },
    { label: 'Bookings', path: '/bookings', icon: 'calendar' },
    { label: 'Clients', path: '/clients', icon: 'users' },
    { label: 'Services', path: '/services', icon: 'scissors' },
    { label: 'Users', path: '/users', icon: 'user' },
    { label: 'Offers', path: '/offers', icon: 'tag' },
    { label: 'Leaves', path: '/leaves', icon: 'tree' },
    { label: 'Time Slot', path: '/timeslot', icon: 'clock-o' },
     { label: 'Add Booking', path: '/addbookings', icon: 'clock-o' },
  ];

    return (
     <SafeAreaView style={drawerStyles.container}>
      <Text style={drawerStyles.header}>Neeri Salon Admin</Text>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.path}
          style={[drawerStyles.item, pathname === item.path && drawerStyles.itemFocused]}
          onPress={() => router.replace(item.path)}
        >
          <Icon
            name={item.icon}
            size={20}
            color={pathname === item.path ? '#6a11cb' : '#333'}
            style={drawerStyles.icon}
          />
          <Text style={[drawerStyles.label, pathname === item.path && drawerStyles.labelFocused]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={drawerStyles.logoutButton} onPress={handleLogout}>
        <Icon name="sign-out" size={20} color="#fff" style={drawerStyles.icon} />
        <Text style={drawerStyles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
    );
  };

  return (
    <>
      {isLoggedIn ? (
        <Drawer
          drawerContent={() => <CustomDrawerContent />}
          screenOptions={{
            headerStyle: { backgroundColor: '#6a11cb' },
            headerTintColor: '#f5f3ff',
            drawerStyle: { backgroundColor: '#f1e8fa' },
            drawerActiveTintColor: '#6a11cb',
            drawerInactiveTintColor: '#333',
          }}
        >
          <Drawer.Screen
           name="dashboard/index"
            options={{
              drawerLabel: 'Dashboard',
              title: 'Dashboard',
            }}
          />

           <Drawer.Screen
           name="bookings/index"
            options={{
              drawerLabel: 'Bookings',
              title: 'Bookings',
            }}
          />



           <Drawer.Screen
           name="clients/index"
            options={{
              drawerLabel: 'Clients',
              title: 'Clients',
            }}
          />
           <Drawer.Screen
           name="services/index"
            options={{
              drawerLabel: 'Services',
              title: 'Services',
            }}
          />

           <Drawer.Screen
           name="users/index"
            options={{
              drawerLabel: 'Users',
              title: 'Users',
            }}
          />

            <Drawer.Screen
           name="offers/index"  
            options={{
              drawerLabel: 'Offers',
              title: 'Offers',
            }}
          />


          <Drawer.Screen
           name="timeslot/index"
            options={{
              drawerLabel: 'timeslot',
              title: 'timeslot',
            }}
          />



          <Drawer.Screen
           name="addbookings/index"
            options={{
              drawerLabel: 'addbookings',
              title: 'addbookings',
            }}
          />



        </Drawer>
      ) : (
        <Stack screenOptions={{headerShown:false}} >
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard" />

          <Stack.Screen name="login" redirect />
          <Stack.Screen name="bookings" />
          <Stack.Screen name="clients" />
          <Stack.Screen name="services" />
          <Stack.Screen name="users" />
          <Stack.Screen name="offers" />
        </Stack>
      )}
    </>
  );
}
const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 35,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6a11cb',
    padding: 20,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row', // Changed to row to align icon and text
    padding: 15,
    alignItems: 'center',
  },
  itemFocused: {
    backgroundColor: '#ffe6e6',
  },
  icon: {
    marginRight: 10, // Space between icon and text
  },
  label: {
    fontSize: 18,
    color: '#333',
  },
  labelFocused: {
    color: '#6a11cb',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row', // Changed to row to align icon and text
    padding: 15,
    marginTop: 20,
    backgroundColor: '#ff4d4d',
    marginHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
})