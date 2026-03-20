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

const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";

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

  const noProfile = error && (error as any).message?.includes("not found");

  if (noProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <Feather name="briefcase" size={36} color={P_ACCENT} />
        </View>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, textAlign: "center", marginBottom: 12 }}>
          Set Up Your Provider Profile
        </Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textSecondary, textAlign: "center", marginBottom: 32, lineHeight: 24 }}>
          Complete your profile to start receiving service requests from customers across KL.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: P_ACCENT, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, width: "100%", alignItems: "center" }}
          onPress={() => router.push("/provider-setup" as any)}
        >
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" }}>Set Up Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={P_ACCENT} />
      </View>
    );
  }

  const stats = dashboard?.stats || {};

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.verifyBadge, { backgroundColor: isVerified ? "#DCFCE7" : isPending ? "#FEF3C7" : "#FEE2E2" }]}>
            <Feather name={isVerified ? "check-circle" : "clock"} size={12} color={isVerified ? "#16A34A" : isPending ? "#D97706" : "#DC2626"} />
            <Text style={[styles.verifyText, { color: isVerified ? "#16A34A" : isPending ? "#D97706" : "#DC2626" }]}>
              {isVerified ? "Verified" : isPending ? "Pending" : "Rejected"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_ACCENT} />}
      >
        {isPending && (
          <View style={styles.verifyBanner}>
            <Feather name="alert-circle" size={18} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.verifyBannerTitle}>Verification Pending</Text>
              <Text style={styles.verifyBannerText}>Your profile is under review. You'll be notified once approved.</Text>
            </View>
          </View>
        )}

        {isRejected && (
          <View style={[styles.verifyBanner, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Feather name="x-circle" size={18} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.verifyBannerTitle, { color: "#DC2626" }]}>Verification Rejected</Text>
              <Text style={styles.verifyBannerText}>Please contact support to resubmit your verification.</Text>
            </View>
          </View>
        )}

        <View style={styles.kpiGrid}>
          {[
            { label: "Pending", value: stats.pending ?? 0, icon: "inbox", color: "#D97706", bg: "#FEF3C7" },
            { label: "Active", value: stats.active ?? 0, icon: "activity", color: "#2563EB", bg: "#DBEAFE" },
            { label: "Completed", value: stats.completed ?? 0, icon: "check-circle", color: "#16A34A", bg: "#DCFCE7" },
            { label: "Rating", value: `${(stats.avgRating ?? 0).toFixed(1)}★`, icon: "star", color: P_ACCENT, bg: P_LIGHT },
          ].map((k) => (
            <View key={k.label} style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: k.bg }]}>
                <Feather name={k.icon as any} size={20} color={k.color} />
              </View>
              <Text style={styles.kpiValue}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.earningsCard}>
          <View>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Text style={styles.earningsValue}>MYR {(stats.totalEarnings ?? 0).toFixed(2)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.earningsLabel}>Completion Rate</Text>
            <Text style={[styles.earningsValue, { fontSize: 22 }]}>{(stats.completionRate ?? 0).toFixed(0)}%</Text>
          </View>
        </View>

        {dashboard?.todayJobs?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {dashboard.todayJobs.map((job: any) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push(`/booking/${job.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.jobCardLeft}>
                  <View style={styles.jobIcon}>
                    <Feather name="briefcase" size={18} color={P_ACCENT} />
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
                </View>
                <StatusChip status={job.status} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {dashboard?.recentActivity?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {dashboard.recentActivity.map((job: any) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push(`/booking/${job.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.jobCardLeft}>
                  <View style={[styles.jobIcon, { backgroundColor: Colors.primary + "12" }]}>
                    <Feather name="calendar" size={18} color={Colors.primary} />
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
                </View>
                <StatusChip status={job.status} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!dashboard?.recentActivity?.length && !isLoading && (
          <View style={styles.emptyState}>
            <Feather name="briefcase" size={48} color={Colors.textTertiary} />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text },
  headerRight: { alignItems: "flex-end" },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifyText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  verifyBanner: {
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
  verifyBannerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#92400E", marginBottom: 2 },
  verifyBannerText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#78350F" },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kpiValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text },
  kpiLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  earningsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: P_COLOR,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  earningsLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 },
  earningsValue: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 12 },
  jobCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  jobCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 12 },
  jobIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center" },
  jobTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  jobMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
