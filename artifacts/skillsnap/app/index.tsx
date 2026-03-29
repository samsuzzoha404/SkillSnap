import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

function AdminScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <View style={styles.adminContainer}>
      <View style={styles.adminCard}>
        <View style={styles.adminIconWrap}>
          <Ionicons name="shield-checkmark" size={40} color="#fff" />
        </View>
        <Text style={styles.adminTitle}>Admin Access</Text>
        <Text style={styles.adminSubtitle}>
          The SkillSnap admin panel is available on the web. Please use a browser to access it.
        </Text>
        <TouchableOpacity
          style={styles.adminBtn}
          onPress={() => Linking.openURL("http://localhost:5173")}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={18} color={Colors.primary} />
          <Text style={styles.adminBtnText}>Open Admin Panel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color="#64748B" />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adminContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center", padding: 24 },
  adminCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 32, alignItems: "center", width: "100%", borderWidth: 1, borderColor: Colors.border },
  adminIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  adminTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text, marginBottom: 10 },
  adminSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginBottom: 28, lineHeight: 22 },
  adminBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginBottom: 14, width: "100%", justifyContent: "center" },
  adminBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.primary },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  logoutBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#64748B" },
});

export default function Index() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === "provider") {
          router.replace("/(provider-tabs)/dashboard");
        } else if (user.role === "consumer") {
          router.replace("/(tabs)");
        }
        // admin role: stays on this screen → AdminScreen rendered below
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.primary }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (user?.role === "admin") {
    return <AdminScreen onLogout={logout} />;
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.primary }}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}
