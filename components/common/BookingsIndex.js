// components/BookingsIndex.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../../config/config';

// ... (rest of the existing code remains the same until the return statement)

return (
  <View style={styles.container}>
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={styles.menuButton}
    >
      <Text style={styles.menuIcon}>☰</Text>
    </TouchableOpacity>
    <View style={styles.innerContainer}>
      <Text style={styles.header}>Bookings</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddBooking')}
      >
        <Text style={styles.actionText}>Add New Booking</Text>
      </TouchableOpacity>
      <View style={styles.filterContainer}>
        {/* ... existing filter buttons ... */}
      </View>
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
        />
      )}
    </View>
  </View>
);

// Update styles to include the add button
const styles = StyleSheet.create({
  // ... existing styles ...
  addButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  // ... rest of the existing styles ...
});