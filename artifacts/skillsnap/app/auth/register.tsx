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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"consumer" | "provider">("consumer");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const created = await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        role,
      });
      // Navigate from server role so we stay in sync if API normalizes role.
      if (created.role === "provider") {
        router.replace("/provider-setup" as any);
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message);
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join SkillSnap and find trusted local experts</Text>
        </View>

        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === "consumer" && styles.roleBtnActive]}
            onPress={() => setRole("consumer")}
          >
            <Ionicons name="person-outline" size={18} color={role === "consumer" ? "#fff" : Colors.textSecondary} />
            <Text style={[styles.roleBtnText, role === "consumer" && styles.roleBtnTextActive]}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === "provider" && { ...styles.roleBtnActive, backgroundColor: "#10B981", borderColor: "#10B981" }]}
            onPress={() => setRole("provider")}
          >
            <Ionicons name="briefcase-outline" size={18} color={role === "provider" ? "#fff" : Colors.textSecondary} />
            <Text style={[styles.roleBtnText, role === "provider" && styles.roleBtnTextActive]}>Service Provider</Text>
          </TouchableOpacity>
        </View>

        {role === "provider" && (
          <View style={styles.providerNote}>
            <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
            <Text style={styles.providerNoteText}>
              As a provider, you'll set up your business profile after registration.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          {[
            { label: "Full Name", value: fullName, setter: setFullName, icon: "person-outline", placeholder: "Ahmad Razif", type: "default" as const },
            { label: "Email Address", value: email, setter: setEmail, icon: "mail-outline", placeholder: "you@example.com", type: "email-address" as const },
            { label: "Phone (optional)", value: phone, setter: setPhone, icon: "call-outline", placeholder: "+60 12 345 6789", type: "phone-pad" as const },
          ].map((field) => (
            <View key={field.label} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name={field.icon as any} size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textTertiary}
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.type}
                  autoCapitalize={field.type === "email-address" ? "none" : "words"}
                />
              </View>
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Min. 6 characters"
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
            style={[styles.registerBtn, loading && styles.registerBtnDisabled,
              role === "provider" && { backgroundColor: "#10B981" }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>
                {role === "provider" ? "Create Provider Account" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/auth/login")}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, justifyContent: "center", marginBottom: 16 },
  header: { marginBottom: 24 },
  logoMark: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 30, color: Colors.text, marginBottom: 8 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textSecondary },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  roleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  roleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  roleBtnTextActive: { color: "#fff" },
  providerNote: {
    flexDirection: "row", gap: 10, alignItems: "center",
    backgroundColor: "#EFF6FF", borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  providerNoteText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#1E40AF", flex: 1 },
  form: { gap: 18 },
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
  registerBtn: { backgroundColor: Colors.primary, paddingVertical: 17, borderRadius: 14, alignItems: "center", marginTop: 8 },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
});
