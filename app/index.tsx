import { useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';
import { config } from '../config/config';
import * as Notifications from 'expo-notifications';
import useNotifications from '../hooks/useNotifications';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setIsLoggedIn } = useContext(AuthContext);
    const expoPushToken = useNotifications();


  useEffect(() => {

    
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          setIsLoggedIn(true);
          router.replace('/dashboard');
        } else {
          // Redirect to login after 2 seconds if not logged in
          const timer = setTimeout(() => {
            router.replace('/login');
          }, 5000);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // Proceed to login on error
        const timer = setTimeout(() => {
          router.replace('/login');
        }, 2000);
        return () => clearTimeout(timer);
      }
    };

    checkSession();
  }, [router, setIsLoggedIn]);

 return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/splash-screen.jpeg")} // replace with your image
        style={styles.fullImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});