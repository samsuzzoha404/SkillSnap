import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const routeAfterLogin = (loggedInUser: { role: string }) => {
    if (loggedInUser.role === "provider") {
      router.replace("/(provider-tabs)/dashboard");
    } else if (loggedInUser.role === "admin") {
      router.replace("/");
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const loggedInUser = await login(email.trim().toLowerCase(), password);
      routeAfterLogin(loggedInUser);
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  /** Fills fields only — user taps Sign In to submit (same creds as scripts/src/seed.ts + mock API). */
  const fillDemoConsumer = () => {
    setEmail("consumer@skillsnap.my");
    setPassword("password123");
  };

  const fillDemoProvider = () => {
    setEmail("electrical.1@skillsnap.my");
    setPassword("password123");
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Ionicons name="flash" size={28} color="#fff" />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your SkillSnap account</Text>
        </View>

        <View style={styles.demoRow}>
          <TouchableOpacity style={styles.demoBtn} onPress={fillDemoConsumer}>
            <Ionicons name="person-outline" size={15} color={Colors.primary} />
            <Text style={styles.demoBtnText}>Demo Consumer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoBtn, { borderColor: "#10B981" + "30", backgroundColor: "#10B981" + "10" }]}
            onPress={fillDemoProvider}
          >
            <Ionicons name="briefcase-outline" size={15} color="#10B981" />
            <Text style={[styles.demoBtnText, { color: "#10B981" }]}>Demo Provider</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/auth/register")}>
            <Text style={styles.footerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, justifyContent: "center", marginBottom: 16 },
  header: { marginBottom: 28 },
  logoMark: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 30, color: Colors.text, marginBottom: 8 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textSecondary },
  demoRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  demoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary + "10",
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  demoBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, backgroundColor: Colors.surface,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: Colors.primary, paddingVertical: 17, borderRadius: 14,
    alignItems: "center", marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
});
