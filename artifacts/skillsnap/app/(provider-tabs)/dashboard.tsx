import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { liveListQueryOptions } from "@/lib/liveQuery";

const P_COLOR = "#0D5C3A";
const P_DARK = "#0A3D27";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";
const P_MINT = "#A7F3D0";

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    requested: { label: "Pending", bg: "#FEF3C7", color: "#D97706" },
    accepted: { label: "Accepted", bg: "#DCFCE7", color: "#16A34A" },
    on_the_way: { label: "On The Way", bg: "#DBEAFE", color: "#2563EB" },
    arrived: { label: "Arrived", bg: "#EDE9FE", color: "#7C3AED" },
    in_progress: { label: "In Progress", bg: "#FEE2E2", color: "#DC2626" },
    completed: { label: "Completed", bg: "#DCFCE7", color: "#16A34A" },
    cancelled: { label: "Cancelled", bg: "#F1F5F9", color: "#64748B" },
  };
  const s = map[status] || { label: status, bg: "#F1F5F9", color: "#64748B" };
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: s.color }}>{s.label}</Text>
    </View>
  );
}

export default function ProviderDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: dashboard, isLoading, refetch, error } = useQuery({
    queryKey: ["provider-dashboard"],
    queryFn: () => api.get("/provider/dashboard"),
    ...liveListQueryOptions,
    retry: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const firstName = user?.fullName?.split(" ")[0] || "Provider";
  const isVerified = dashboard?.profile?.verificationStatus === "verified";
  const isPending = dashboard?.profile?.verificationStatus === "pending";
  const isRejected = dashboard?.profile?.verificationStatus === "rejected";
  const errMsg = String((error as Error)?.message || "").toLowerCase();
  const noProfile = !!error && (errMsg.includes("not found") || errMsg.includes("404"));

  if (noProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F0FDF4" }}>
        <View style={[styles.heroBg, { paddingTop: topPad + 20, paddingBottom: 40 }]}>
          <View style={styles.heroIcon}>
            <Feather name="briefcase" size={36} color={P_MINT} />
          </View>
          <Text style={styles.heroSetupTitle}>Set Up Your{"\n"}Provider Profile</Text>
          <Text style={styles.heroSetupSub}>
            Complete your profile to start receiving service requests from customers across KL.
          </Text>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => router.push("/provider-setup" as any)}
          >
            <Feather name="arrow-right" size={18} color={P_COLOR} />
            <Text style={styles.setupBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0FDF4" }}>
        <ActivityIndicator size="large" color={P_ACCENT} />
      </View>
    );
  }

  if (error && !noProfile) {
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
        <Text style={{ marginTop: 16, textAlign: "center", color: P_DARK, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
          Could not load dashboard
        </Text>
        <Text style={{ marginTop: 8, textAlign: "center", color: "#64748B", fontSize: 13, fontFamily: "Inter_400Regular" }}>
          {(error as Error).message}
        </Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: P_ACCENT, borderRadius: 10 }}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = dashboard?.stats || {};

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F0FDF4" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_MINT} />}
      >
        <View style={[styles.heroBg, { paddingTop: topPad + 12 }]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroGreeting}>{getGreeting()},</Text>
              <Text style={styles.heroName}>{firstName} 👋</Text>
            </View>
            <View style={[styles.verifyPill, {
              backgroundColor: isVerified ? P_MINT + "30" : isPending ? "#FEF3C7" : "#FEE2E2",
              borderColor: isVerified ? P_MINT : isPending ? "#FDE68A" : "#FECACA",
            }]}>
              <Feather
                name={isVerified ? "shield" : "clock"}
                size={12}
                color={isVerified ? P_MINT : isPending ? "#D97706" : "#DC2626"}
              />
              <Text style={[styles.verifyPillText, {
                color: isVerified ? P_MINT : isPending ? "#D97706" : "#DC2626",
              }]}>
                {isVerified ? "Verified" : isPending ? "Pending" : "Rejected"}
              </Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            {[
              { label: "Total Earned", value: `MYR ${(stats.totalEarnings ?? 0).toFixed(0)}`, icon: "dollar-sign" },
              { label: "Completion", value: `${(stats.completionRate ?? 0).toFixed(0)}%`, icon: "check-circle" },
              { label: "Rating", value: `${(stats.avgRating ?? 0).toFixed(1)}★`, icon: "star" },
            ].map((s, i) => (
              <View key={s.label} style={[styles.heroStat, i < 2 && styles.heroStatBorder]}>
                <Text style={styles.heroStatValue}>{s.value}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {isPending && (
          <View style={styles.banner}>
            <Feather name="alert-circle" size={18} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bannerTitle}>Verification Pending</Text>
              <Text style={styles.bannerText}>Your profile is under review. You'll be notified once approved.</Text>
            </View>
          </View>
        )}

        {isRejected && (
          <View style={[styles.banner, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Feather name="x-circle" size={18} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.bannerTitle, { color: "#DC2626" }]}>Verification Rejected</Text>
              <Text style={styles.bannerText}>Please contact support to resubmit your verification.</Text>
            </View>
          </View>
        )}

        <View style={styles.kpiRow}>
          {[
            { label: "Pending", value: stats.pending ?? 0, icon: "inbox", color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
            { label: "Active", value: stats.active ?? 0, icon: "activity", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
            { label: "Done", value: stats.completed ?? 0, icon: "check-circle", color: P_ACCENT, bg: P_LIGHT, border: "#6EE7B7" },
          ].map((k) => (
            <View key={k.label} style={[styles.kpiCard, { borderColor: k.border }]}>
              <View style={[styles.kpiIcon, { backgroundColor: k.bg }]}>
                <Feather name={k.icon as any} size={18} color={k.color} />
              </View>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {dashboard?.todayJobs?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
            </View>
            {dashboard.todayJobs.map((job: any) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push(`/booking/${job.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.jobAccent} />
                <View style={styles.jobCardInner}>
                  <View style={styles.jobIcon}>
                    <Feather name="briefcase" size={16} color={P_ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle} numberOfLines={1}>
                      {job.serviceRequest?.title || "Service Job"}
                    </Text>
                    <Text style={styles.jobMeta}>
                      {new Date(job.scheduledAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                      {job.serviceRequest?.category?.name ? ` · ${job.serviceRequest.category.name}` : ""}
                    </Text>
                  </View>
                  <StatusChip status={job.status} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {dashboard?.recentActivity?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: Colors.textTertiary }]} />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            {dashboard.recentActivity.map((job: any) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push(`/booking/${job.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.jobAccent, { backgroundColor: Colors.border }]} />
                <View style={styles.jobCardInner}>
                  <View style={[styles.jobIcon, { backgroundColor: "#F1F5F9" }]}>
                    <Feather name="calendar" size={16} color={Colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle} numberOfLines={1}>
                      {job.serviceRequest?.title || "Service Request"}
                    </Text>
                    <Text style={styles.jobMeta}>
                      {new Date(job.scheduledAt).toLocaleDateString("en-MY", { month: "short", day: "numeric" })}
                      {job.serviceRequest?.category?.name ? ` · ${job.serviceRequest.category.name}` : ""}
                    </Text>
                  </View>
                  <StatusChip status={job.status} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!dashboard?.recentActivity?.length && !isLoading && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="briefcase" size={32} color={P_ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>No jobs yet</Text>
            <Text style={styles.emptyText}>
              {isVerified
                ? "You'll start receiving booking requests once customers find you."
                : "Complete verification to start receiving requests."}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBg: {
    backgroundColor: P_COLOR,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  heroGreeting: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.65)", marginBottom: 2 },
  heroName: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  verifyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  verifyPillText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 18,
    padding: 16,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.15)" },
  heroStatValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff", marginBottom: 2 },
  heroStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20, alignSelf: "center",
  },
  heroSetupTitle: {
    fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff",
    textAlign: "center", marginBottom: 12, lineHeight: 36,
  },
  heroSetupSub: {
    fontFamily: "Inter_400Regular", fontSize: 15, color: "rgba(255,255,255,0.7)",
    textAlign: "center", lineHeight: 24, marginBottom: 28,
  },
  setupBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 14, alignSelf: "center",
  },
  setupBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: P_COLOR },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    padding: 14,
  },
  bannerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#92400E", marginBottom: 2 },
  bannerText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#78350F" },
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kpiValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  kpiLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: P_ACCENT },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  jobCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  jobAccent: { width: 4, backgroundColor: P_ACCENT },
  jobCardInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  jobIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center" },
  jobTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  jobMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyState: { alignItems: "center", paddingVertical: 50, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
