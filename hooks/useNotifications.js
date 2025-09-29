import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/config/config';

export default function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState(null);

  useEffect(() => {
    (async () => {
      const token = await registerForPushNotificationsAsync();
      // console.log('Expo push token:', token);
      if (token) {
        setExpoPushToken(token);
        await AsyncStorage.setItem('expoPushToken', token);
        await sendTokenToServer(token);
      } else {
        console.warn('No push token generated');
      }
    })();

    const receivedSub = Notifications.addNotificationReceivedListener(notification => {
      // console.log('Notification received:', notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      // console.log('User tapped notification:', response);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return expoPushToken;
}

async function registerForPushNotificationsAsync() {

  // console.log(Device)
  // if (!Device.isDevice) {
  //   console.warn('Push notifications require a physical device.');
  //   return null;
  // }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('Push notification permissions denied');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '2c5035aa-d09b-4226-8957-0aa12d5d6429', // Replace with your Expo project ID
    });
    const token = tokenData.data;
    // console.log('Generated token:', token);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    console.error('Error generating push token:', error);
    return null;
  }
}

async function sendTokenToServer(token) {
  try {
    // console.log('Sending token to server:', token);

    const response = await fetch(`${config.BASE_URL}/api/save-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 1,   // fixed user_id = 1
        token: token, // expo push token
      }),
    });

    const responseData = await response.json();
    // console.log('Server response:', responseData);

    if (!response.ok) {
      console.error('Server error:', response.status, responseData);
    }
  } catch (err) {
    console.error('Could not save token to server:', err);
  }
}
