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
import { liveListQueryOptions } from "@/lib/liveQuery";

const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";
const P_MINT = "#A7F3D0";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProviderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: profile, isLoading, refetch, isError, error } = useQuery({
    queryKey: ["provider-me"],
    queryFn: async () => {
      try {
        return await api.get("/provider/me");
      } catch (e: any) {
        const m = String(e?.message || "").toLowerCase();
        if (m.includes("not found") || m.includes("404")) return null;
        throw e;
      }
    },
    ...liveListQueryOptions,
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

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      await logout();
      router.replace("/auth/login" as any);
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login" as any);
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
  const verifyColor = verificationStatus === "verified" ? P_ACCENT : verificationStatus === "pending" ? "#D97706" : "#DC2626";
  const verifyBg = verificationStatus === "verified" ? P_LIGHT : verificationStatus === "pending" ? "#FEF3C7" : "#FEE2E2";
  const verifyBorder = verificationStatus === "verified" ? "#6EE7B7" : verificationStatus === "pending" ? "#FDE68A" : "#FECACA";

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0FDF4" }}>
        <ActivityIndicator size="large" color={P_ACCENT} />
      </View>
    );
  }

  if (isError && error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: "#F0FDF4",
        }}
      >
        <Feather name="wifi-off" size={40} color="#64748B" />
        <Text style={{ marginTop: 16, textAlign: "center", color: P_COLOR, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
          Could not load profile
        </Text>
        <Text style={{ marginTop: 8, textAlign: "center", color: "#64748B", fontSize: 13, fontFamily: "Inter_400Regular" }}>
          {(error as Error).message}
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F0FDF4" }}
        contentContainerStyle={{ paddingTop: topPad + 24, paddingBottom: botPad + 40, paddingHorizontal: 24 }}
      >
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: P_ACCENT, alignItems: "center", justifyContent: "center" }}>
            <Feather name="briefcase" size={32} color="#fff" />
          </View>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, marginTop: 16, textAlign: "center" }}>
            Complete your provider profile
          </Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
            Add your business details so customers can find you. After submission, status stays Pending until an admin verifies you.
          </Text>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: P_ACCENT,
            paddingVertical: 16,
            borderRadius: 14,
          }}
          onPress={() => router.push("/provider-setup" as any)}
          activeOpacity={0.85}
        >
          <Feather name="arrow-right" size={18} color="#fff" />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" }}>Set up profile</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F0FDF4" }}
      contentContainerStyle={{ paddingBottom: botPad + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_MINT} />}
    >
      <View style={[styles.hero, { paddingTop: topPad + 12 }]}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{initials}</Text>
          <View style={[styles.verifyDot, { backgroundColor: verifyColor }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName}>{user?.fullName || profile?.fullName || "Provider"}</Text>
          {profile?.businessName && (
            <Text style={styles.heroBiz}>{profile.businessName}</Text>
          )}
          <Text style={styles.heroEmail}>{user?.email || profile?.email}</Text>
          <View style={[styles.verifyBadge, { backgroundColor: verifyBg, borderColor: verifyBorder }]}>
            <Feather
              name={verificationStatus === "verified" ? "shield" : "clock"}
              size={11}
              color={verifyColor}
            />
            <Text style={[styles.verifyBadgeText, { color: verifyColor }]}>
              {verificationStatus === "verified"
                ? "Verified Provider"
                : verificationStatus === "pending"
                ? "Pending Verification"
                : "Verification Rejected"}
            </Text>
          </View>
        </View>
      </View>

      {profile && (
        <View style={styles.statsRow}>
          {[
            { label: "Rating", value: `${(profile.avgRating || 0).toFixed(1)}★`, icon: "star", color: "#F59E0B" },
            { label: "Total Jobs", value: profile.totalJobs || 0, icon: "briefcase", color: P_ACCENT },
            { label: "Completion", value: `${(profile.completionRate || 0).toFixed(0)}%`, icon: "check-circle", color: "#2563EB" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Feather name={stat.icon as any} size={18} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {profile && (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Business Info</Text>
            </View>
            <View style={styles.card}>
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
                      <Feather name={row.icon as any} size={15} color={P_ACCENT} />
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
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Services Offered</Text>
              </View>
              <View style={styles.card}>
                {profile.services.map((svc: any, i: number, arr: any[]) => (
                  <View key={svc.id}>
                    <View style={styles.serviceRow}>
                      <View style={styles.infoIcon}>
                        <Feather name="tag" size={15} color={P_ACCENT} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{svc.category?.name || "Service"}</Text>
                        <Text style={styles.servicePrice}>
                          MYR {svc.basePrice}/{svc.priceType === "hourly" ? "hr" : "job"}
                        </Text>
                      </View>
                      <View style={[styles.activeBadge, { backgroundColor: svc.isActive ? P_LIGHT : "#F1F5F9", borderColor: svc.isActive ? "#6EE7B7" : "#E2E8F0" }]}>
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
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Weekly Schedule</Text>
              </View>
              <View style={styles.card}>
                {profile.availability.map((slot: any, i: number, arr: any[]) => (
                  <View key={slot.id}>
                    <View style={styles.scheduleRow}>
                      <View style={[styles.dayBadge, { backgroundColor: slot.isAvailable ? P_LIGHT : "#F1F5F9" }]}>
                        <Text style={[styles.dayName, { color: slot.isAvailable ? P_ACCENT : Colors.textTertiary }]}>
                          {DAY_NAMES[slot.dayOfWeek] || `D${slot.dayOfWeek}`}
                        </Text>
                      </View>
                      {slot.isAvailable ? (
                        <Text style={styles.dayHours}>{slot.startTime} – {slot.endTime}</Text>
                      ) : (
                        <Text style={styles.dayOff}>Day Off</Text>
                      )}
                      <Switch
                        value={slot.isAvailable}
                        onValueChange={() => handleToggleDay(slot.dayOfWeek, slot.isAvailable)}
                        trackColor={{ false: "#E2E8F0", true: P_ACCENT }}
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
          <Feather name="edit-2" size={17} color="#fff" />
          <Text style={styles.editBtnText}>Edit Profile & Services</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Feather name="log-out" size={17} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>SkillSnap Provider · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: P_COLOR,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
  },
  avatarWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  verifyDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: P_COLOR,
  },
  heroName: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff", marginBottom: 1 },
  heroEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8 },
  heroBiz: { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 2 },
  verifyBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, alignSelf: "flex-start",
    borderWidth: 1,
  },
  verifyBadgeText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  statsRow: {
    flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 24,
  },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14,
    alignItems: "center", gap: 5,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 17 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: P_ACCENT },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  card: {
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  infoValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 62 },
  serviceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  serviceName: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  servicePrice: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  activeBadgeText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  scheduleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  dayBadge: { width: 40, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dayName: { fontFamily: "Inter_700Bold", fontSize: 12 },
  dayHours: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  dayOff: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textTertiary, flex: 1 },
  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: P_ACCENT, paddingVertical: 16, borderRadius: 14,
    shadowColor: P_ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  editBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.error + "10", borderWidth: 1.5, borderColor: Colors.error + "30",
    paddingVertical: 16, borderRadius: 14,
  },
  logoutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.error },
  version: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary, textAlign: "center", marginTop: 8, marginBottom: 8 },
});
