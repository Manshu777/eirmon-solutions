import { View, Text, StyleSheet,TouchableOpacity } from 'react-native';

import { useRouter } from 'expo-router';

export default function Card({ title, value, description, icon, style, navigateTo }) {
 const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={() => {
        if (navigateTo) {
          router.push(navigateTo); // Use push for navigation
        }
      }}
      disabled={!navigateTo} // Disable if no navigateTo prop
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    width: '48%', // For two-column layout
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  value: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6a11cb',
    marginVertical: 5,
  },
  description: {
    fontSize: 12,
    color: '#888',
  },
});