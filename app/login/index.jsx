import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../contexts/AuthContext";
import { StyleSheet } from "react-native";
import { config } from "../../config/config";
import axios from "axios";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ username: "", password: "" });
  const router = useRouter();
  const { setIsLoggedIn } = useContext(AuthContext);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem(
          config.STORAGE_KEYS.AUTH_TOKEN
        );
       
        if (token) {
          setIsLoggedIn(true);
          // router.replace("/dashboard");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    checkSession();
  }, [router, setIsLoggedIn]);

  const getCsrfCookie = async () => {
    try {
      const response = await fetch(
        `${config.BASE_URL}${config.API_ENDPOINTS.CSRF_COOKIE}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch CSRF cookie");
      }
    } catch (error) {
      console.error("Error fetching CSRF cookie:", error);
      throw error;
    }
  };

const onSubmit = async () => {
  if (!validateForm()) {
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  try {
    const response = await axios.post(`${config.BASE_URL}${config.API_ENDPOINTS.LOGIN}`,
      {
        email: username.trim(),
        password: password,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true, // similar to fetch's credentials: "include"
      }
    );

    const data = response.data;
    // console.log(`${config.BASE_URL}${config.API_ENDPOINTS.LOGIN}`);

    // ✅ If login success
    await AsyncStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, data.token);
    setIsLoggedIn(true);
    router.replace("/dashboard");

  } catch (error) {
    // Handle validation errors
    if (error.response) {
      const { status, data } = error.response;

      if (status === 422 && data.errors) {
        const newErrors = { username: "", password: "" };
        if (data.errors.email) newErrors.username = data.errors.email[0];
        if (data.errors.password) newErrors.password = data.errors.password[0];
        setErrors(newErrors);
      } else {
        const errorMessage = data.message || "Invalid email or password";
        Alert.alert("Login Failed", errorMessage);
      }
    } else {
      // Network or server not reachable
      // console.log(error)
      Alert.alert(
        "Error",
        "An error occurred while logging in. Please check your network and try again."
      );
    }
  } finally {
    setIsLoading(false);
  }
};
  const validateForm = () => {
    let valid = true;
    const newErrors = { username: "", password: "" };

    if (!username) {
      newErrors.username = "Username is required";
      valid = false;
    }
    if (!password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  return (
   <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.innerContainer}>
        <Image
          source={require("../../assets/images/logo.webp")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>
          Welcome To <Text style={styles.difText}>Neeri Salon </Text>
        </Text>
        <View style={styles.form}>
          <View>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#151515ff"
              onChangeText={setUsername}
              value={username}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>
          <View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#151515ff"
              secureTextEntry
              onChangeText={setPassword}
              value={password}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  innerContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  difText:{
 color: "#6a11cb",
  },
  form: {
    width: "100%",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  button: {
    backgroundColor: "#6a11cb",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#ff9999",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
