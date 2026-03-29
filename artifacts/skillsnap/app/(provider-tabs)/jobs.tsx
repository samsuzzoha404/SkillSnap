import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { liveListQueryOptions } from "@/lib/liveQuery";

const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";

const STATUS_FLOW = [
  { status: "accepted", label: "Accepted", next: "on_the_way", action: "Start Journey", icon: "navigation" },
  { status: "on_the_way", label: "On The Way", next: "arrived", action: "Mark Arrived", icon: "map-pin" },
  { status: "arrived", label: "Arrived", next: "in_progress", action: "Start Work", icon: "tool" },
  { status: "in_progress", label: "In Progress", next: "completed", action: "Complete Job", icon: "check-circle" },
  { status: "completed", label: "Completed", next: null, action: null, icon: null },
  { status: "cancelled", label: "Cancelled", next: null, action: null, icon: null },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  requested: { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" },
  accepted: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  on_the_way: { bg: "#EDE9FE", color: "#7C3AED", border: "#C4B5FD" },
  arrived: { bg: "#FFF1F2", color: "#E11D48", border: "#FECDD3" },
  in_progress: { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" },
  completed: { bg: P_LIGHT, color: P_ACCENT, border: "#6EE7B7" },
  cancelled: { bg: "#F8FAFC", color: "#94A3B8", border: "#E2E8F0" },
};

const TABS = [
  { key: "active", label: "Active", icon: "activity" },
  { key: "completed", label: "Done", icon: "check-circle" },
  { key: "cancelled", label: "Cancelled", icon: "x-circle" },
];

const ACTIVE_STATUSES = ["accepted", "on_the_way", "arrived", "in_progress"];

export default function ProviderJobs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: allJobs = [], isLoading, refetch } = useQuery({
    queryKey: ["provider-bookings"],
    queryFn: () => api.get("/provider/bookings"),
    ...liveListQueryOptions,
    retry: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (bookingId: string, nextStatus: string) => {
    const labels: Record<string, string> = {
      on_the_way: "on the way to the location",
      arrived: "arrived at the location",
      in_progress: "starting the work",
      completed: "completed",
    };
    Alert.alert(
      "Update Job Status",
      `Mark this job as ${labels[nextStatus] || nextStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setUpdating(bookingId);
            try {
              await api.patch(`/bookings/${bookingId}/status`, { status: nextStatus });
              qc.invalidateQueries({ queryKey: ["provider-bookings"] });
              qc.invalidateQueries({ queryKey: ["provider-dashboard"] });
              if (nextStatus === "completed") {
                Alert.alert("Job Complete!", "Great work! This job has been marked as complete.");
              }
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const filteredJobs = allJobs.filter((j: any) => {
    if (activeTab === "active") return ACTIVE_STATUSES.includes(j.status);
    if (activeTab === "completed") return j.status === "completed";
    if (activeTab === "cancelled") return j.status === "cancelled";
    return true;
  });

  const renderJob = ({ item }: { item: any }) => {
    const req = item.serviceRequest || {};
    const statusFlow = STATUS_FLOW.find((s) => s.status === item.status);
    const sc = STATUS_COLORS[item.status] || { bg: "#F8FAFC", color: "#94A3B8", border: "#E2E8F0" };
    const isUpdating = updating === item.id;
    const isActive = ACTIVE_STATUSES.includes(item.status);

    return (
      <View style={[styles.card, isActive && styles.cardActive]}>
        {isActive && <View style={styles.cardAccent} />}
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.jobId}>#{item.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.jobTitle} numberOfLines={2}>{req.title || "Service Job"}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
              <Text style={[styles.statusText, { color: sc.color }]}>
                {statusFlow?.label || item.status}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color={Colors.textTertiary} />
              <Text style={styles.metaText}>
                {new Date(item.scheduledAt).toLocaleDateString("en-MY", { weekday: "short", month: "short", day: "numeric" })}
              </Text>
            </View>
            {req.category?.name && (
              <View style={styles.metaItem}>
                <Feather name="tag" size={12} color={Colors.textTertiary} />
                <Text style={styles.metaText}>{req.category.name}</Text>
              </View>
            )}
            {item.consumer?.fullName && (
              <View style={styles.metaItem}>
                <Feather name="user" size={12} color={Colors.textTertiary} />
                <Text style={styles.metaText}>{item.consumer.fullName}</Text>
              </View>
            )}
            {item.finalPrice && (
              <View style={styles.metaItem}>
                <Feather name="dollar-sign" size={12} color={P_ACCENT} />
                <Text style={[styles.metaText, { color: P_ACCENT, fontFamily: "Inter_600SemiBold" }]}>
                  MYR {item.finalPrice.toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          {req.address && (
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={12} color={Colors.textTertiary} />
              <Text style={styles.addressText} numberOfLines={1}>{req.address}</Text>
            </View>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => router.push(`/booking/${item.id}` as any)}
            >
              <Feather name="eye" size={14} color={P_COLOR} />
              <Text style={styles.viewBtnText}>Details</Text>
            </TouchableOpacity>

            {statusFlow?.next && activeTab === "active" && (
              <TouchableOpacity
                style={[styles.nextBtn, isUpdating && { opacity: 0.7 }]}
                onPress={() => handleStatusUpdate(item.id, statusFlow.next!)}
                disabled={!!updating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    {statusFlow.icon && <Feather name={statusFlow.icon as any} size={14} color="#fff" />}
                    <Text style={styles.nextBtnText}>{statusFlow.action}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {activeTab === "active" && item.status !== "cancelled" && (
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() => {
                Alert.alert("Cancel Job", "Are you sure you want to cancel this job?", [
                  { text: "No", style: "cancel" },
                  {
                    text: "Cancel Job",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await api.patch(`/bookings/${item.id}/status`, { status: "cancelled" });
                        qc.invalidateQueries({ queryKey: ["provider-bookings"] });
                      } catch (e: any) {
                        Alert.alert("Error", e.message);
                      }
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.cancelLinkText}>Cancel this job</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F0FDF4" }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <Text style={styles.headerSub}>
          {allJobs.filter((j: any) => ACTIVE_STATUSES.includes(j.status)).length} active
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map((tab) => {
          const count = allJobs.filter((j: any) => {
            if (tab.key === "active") return ACTIVE_STATUSES.includes(j.status);
            return j.status === tab.key;
          }).length;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Feather name={tab.icon as any} size={14} color={isActive ? "#fff" : Colors.textTertiary} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, isActive && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={P_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 100, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="briefcase" size={32} color={P_ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>No {activeTab} jobs</Text>
              <Text style={styles.emptyText}>
                {activeTab === "active" ? "Accept requests from your inbox to see jobs here." : "Your job history will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: P_COLOR,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 4,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff" },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  tabsContainer: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  tabActive: { backgroundColor: P_COLOR, borderColor: P_COLOR },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    backgroundColor: P_ACCENT, minWidth: 18, height: 18,
    borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  tabBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardActive: { borderColor: "#6EE7B7" },
  cardAccent: { height: 4, backgroundColor: P_ACCENT },
  cardContent: { padding: 16 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  jobId: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginBottom: 3 },
  jobTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, maxWidth: 180 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  addressRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 14, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
  },
  addressText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  cardActions: { flexDirection: "row", gap: 10 },
  viewBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#D1FAE5",
    backgroundColor: P_LIGHT,
  },
  viewBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: P_COLOR },
  nextBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 10, backgroundColor: P_ACCENT,
  },
  nextBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  cancelLink: { alignItems: "center", marginTop: 10 },
  cancelLinkText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
