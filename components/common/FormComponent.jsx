import React from 'react';
import { View, TextInput, Button,  StyleSheet } from 'react-native';
import {Picker} from '@react-native-picker/picker';

const FormComponent = ({
  formFields,
  formState,
  setFormState,
  buttons,
}) => {
  return (
    <View style={styles.formContainer}>
      {formFields.map((field) => (
        field.options ? (
          <Picker
            key={field.key}
             style={{ height: 70, justifyContent: 'center' }}
            selectedValue={formState[field.key]}
            onValueChange={(value) => setFormState({ ...formState, [field.key]: value })}
           
          >
            <Picker.Item label={field.placeholder} value="" />
            {field.options.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        ) : (
          <TextInput
            key={field.key}
            style={styles.input}
            placeholder={field.placeholder}
            placeholderTextColor="#151515ff"
            value={formState[field.key]}
            onChangeText={(text) => setFormState({ ...formState, [field.key]: text })}
          />
        )
      ))}
      <View style={styles.buttonsContainer}>
        {buttons.map((button, index) => (
          <Button
            key={index}
            title={button.title}
            onPress={button.onPress}
            color={button.color || '#6a11cb'}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default FormComponent;