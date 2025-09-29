import { StyleSheet } from 'react-native';

const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
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
});

export default drawerStyles;