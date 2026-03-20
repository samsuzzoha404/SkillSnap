import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProviderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["provider-me"],
    queryFn: () => api.get("/provider/me"),
    retry: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleToggleDay = async (dayOfWeek: number, currentValue: boolean) => {
    try {
      const schedule = (profile?.availability || []).map((a: any) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.dayOfWeek === dayOfWeek ? !currentValue : a.isAvailable,
      }));
      await api.put("/provider/schedule", { availability: schedule });
      qc.invalidateQueries({ queryKey: ["provider-me"] });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "P";

  const verificationStatus = profile?.verificationStatus || "pending";
  const verifyColor = verificationStatus === "verified" ? "#16A34A" : verificationStatus === "pending" ? "#D97706" : "#DC2626";
  const verifyBg = verificationStatus === "verified" ? "#DCFCE7" : verificationStatus === "pending" ? "#FEF3C7" : "#FEE2E2";

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={P_ACCENT} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: botPad + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_ACCENT} />}
    >
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: P_COLOR }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.fullName || profile?.fullName || "Provider"}</Text>
          <Text style={styles.profileEmail}>{user?.email || profile?.email}</Text>
          <View style={[styles.verifyBadge, { backgroundColor: verifyBg }]}>
            <Feather
              name={verificationStatus === "verified" ? "check-circle" : "clock"}
              size={12}
              color={verifyColor}
            />
            <Text style={[styles.verifyText, { color: verifyColor }]}>
              {verificationStatus === "verified" ? "Verified Provider" : verificationStatus === "pending" ? "Pending Verification" : "Verification Rejected"}
            </Text>
          </View>
        </View>
      </View>

      {profile && (
        <>
          <View style={styles.statsRow}>
            {[
              { label: "Avg Rating", value: `${(profile.avgRating || 0).toFixed(1)}★`, icon: "star" },
              { label: "Total Jobs", value: profile.totalJobs || 0, icon: "briefcase" },
              { label: "Completion", value: `${(profile.completionRate || 0).toFixed(0)}%`, icon: "check-circle" },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Feather name={stat.icon as any} size={20} color={P_ACCENT} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Info</Text>
            <View style={styles.infoCard}>
              {[
                { icon: "briefcase", label: "Business Name", value: profile.businessName || "—" },
                { icon: "info", label: "Bio", value: profile.bio || "—" },
                { icon: "clock", label: "Experience", value: `${profile.yearsExperience || 0} years` },
                { icon: "map-pin", label: "Service Area", value: `${profile.serviceRadiusKm || 15} km radius` },
                { icon: "navigation", label: "Address", value: profile.address || "Not set" },
              ].map((row, i, arr) => (
                <View key={row.label}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name={row.icon as any} size={16} color={P_ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>{row.label}</Text>
                      <Text style={styles.infoValue} numberOfLines={3}>{row.value}</Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>

          {profile.services?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services Offered</Text>
              <View style={styles.servicesCard}>
                {profile.services.map((svc: any, i: number, arr: any[]) => (
                  <View key={svc.id}>
                    <View style={styles.serviceRow}>
                      <View style={[styles.infoIcon, { backgroundColor: P_LIGHT }]}>
                        <Feather name="tag" size={16} color={P_ACCENT} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{svc.category?.name || "Service"}</Text>
                        <Text style={styles.servicePrice}>
                          MYR {svc.basePrice}/{svc.priceType === "hourly" ? "hr" : "job"}
                        </Text>
                      </View>
                      <View style={[styles.activeBadge, { backgroundColor: svc.isActive ? P_LIGHT : Colors.surface }]}>
                        <Text style={[styles.activeBadgeText, { color: svc.isActive ? P_ACCENT : Colors.textTertiary }]}>
                          {svc.isActive ? "Active" : "Off"}
                        </Text>
                      </View>
                    </View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {profile.availability?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Schedule</Text>
              <View style={styles.scheduleCard}>
                {profile.availability.map((slot: any, i: number, arr: any[]) => (
                  <View key={slot.id}>
                    <View style={styles.scheduleRow}>
                      <Text style={[styles.dayName, !slot.isAvailable && { color: Colors.textTertiary }]}>
                        {DAY_NAMES[slot.dayOfWeek] || `Day ${slot.dayOfWeek}`}
                      </Text>
                      {slot.isAvailable ? (
                        <Text style={styles.dayHours}>{slot.startTime} – {slot.endTime}</Text>
                      ) : (
                        <Text style={styles.dayOff}>Day Off</Text>
                      )}
                      <Switch
                        value={slot.isAvailable}
                        onValueChange={() => handleToggleDay(slot.dayOfWeek, slot.isAvailable)}
                        trackColor={{ false: Colors.border, true: P_ACCENT }}
                        thumbColor="#fff"
                      />
                    </View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/provider-setup" as any)} activeOpacity={0.8}>
          <Feather name="edit-2" size={18} color={P_ACCENT} />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>SkillSnap Provider · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff" },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 2 },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  verifyBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start",
  },
  verifyText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text, marginBottom: 12 },
  infoCard: { backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  infoValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  servicesCard: { backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  serviceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  serviceName: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  servicePrice: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadgeText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  scheduleCard: { backgroundColor: Colors.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  scheduleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  dayName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, width: 36 },
  dayHours: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  dayOff: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, flex: 1 },
  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#ECFDF5", borderWidth: 1.5, borderColor: "#10B981" + "50",
    paddingVertical: 16, borderRadius: 14,
  },
  editBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#10B981" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.error + "10", borderWidth: 1, borderColor: Colors.error + "30",
    paddingVertical: 16, borderRadius: 14,
  },
  logoutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.error },
  version: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary, textAlign: "center", marginTop: 8, marginBottom: 8 },
});
