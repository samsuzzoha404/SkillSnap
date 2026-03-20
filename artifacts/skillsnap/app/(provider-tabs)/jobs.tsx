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

const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";

const STATUS_FLOW = [
  { status: "accepted", label: "Accepted", next: "on_the_way", action: "Start Journey" },
  { status: "on_the_way", label: "On The Way", next: "arrived", action: "Mark Arrived" },
  { status: "arrived", label: "Arrived", next: "in_progress", action: "Start Work" },
  { status: "in_progress", label: "In Progress", next: "completed", action: "Mark Complete" },
  { status: "completed", label: "Completed", next: null, action: null },
  { status: "cancelled", label: "Cancelled", next: null, action: null },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  requested: { bg: "#FEF3C7", color: "#D97706" },
  accepted: { bg: "#DBEAFE", color: "#2563EB" },
  on_the_way: { bg: "#EDE9FE", color: "#7C3AED" },
  arrived: { bg: "#FEE2E2", color: "#DC2626" },
  in_progress: { bg: "#FEF3C7", color: "#D97706" },
  completed: { bg: "#DCFCE7", color: "#16A34A" },
  cancelled: { bg: "#F1F5F9", color: "#64748B" },
};

const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
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
    refetchInterval: 20000,
    retry: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (bookingId: string, nextStatus: string) => {
    const labels: Record<string, string> = {
      on_the_way: "on the way",
      arrived: "arrived at location",
      in_progress: "in progress",
      completed: "completed",
    };
    Alert.alert(
      "Update Status",
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
                Alert.alert("Job Completed!", "Great work! This job has been marked as complete.");
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
    const statusColor = STATUS_COLORS[item.status] || { bg: "#F1F5F9", color: "#64748B" };
    const isUpdating = updating === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.jobId}>#{item.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.jobTitle} numberOfLines={2}>{req.title || "Service Job"}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.color }]}>
              {statusFlow?.label || item.status}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>
              {new Date(item.scheduledAt).toLocaleDateString("en-MY", { month: "short", day: "numeric" })}
            </Text>
          </View>
          {req.category?.name && (
            <View style={styles.metaItem}>
              <Feather name="tag" size={13} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{req.category.name}</Text>
            </View>
          )}
          {item.consumer?.fullName && (
            <View style={styles.metaItem}>
              <Feather name="user" size={13} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{item.consumer.fullName}</Text>
            </View>
          )}
          {item.finalPrice && (
            <View style={styles.metaItem}>
              <Feather name="dollar-sign" size={13} color={Colors.textTertiary} />
              <Text style={styles.metaText}>MYR {item.finalPrice.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {req.address && (
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={13} color={Colors.textTertiary} />
            <Text style={styles.addressText} numberOfLines={1}>{req.address}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => router.push(`/booking/${item.id}` as any)}
          >
            <Feather name="eye" size={14} color={Colors.primary} />
            <Text style={styles.viewBtnText}>View Details</Text>
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
                  <Text style={styles.nextBtnText}>{statusFlow.action}</Text>
                  <Feather name="arrow-right" size={14} color="#fff" />
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
            <Text style={styles.cancelLinkText}>Cancel job</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={styles.headerTitle}>My Jobs</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const count = allJobs.filter((j: any) => {
            if (tab.key === "active") return ACTIVE_STATUSES.includes(j.status);
            return j.status === tab.key;
          }).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabCount, activeTab === tab.key && { backgroundColor: P_ACCENT }]}>
                  <Text style={styles.tabCountText}>{count}</Text>
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
              <Feather name="briefcase" size={48} color={Colors.textTertiary} />
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
  header: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  tabs: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: "#0D5C3A" },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { color: "#fff" },
  tabCount: {
    backgroundColor: Colors.textTertiary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabCountText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  jobId: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  jobTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  addressText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  cardActions: { flexDirection: "row", gap: 10 },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },
  nextBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#10B981",
  },
  nextBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  cancelLink: { alignItems: "center", marginTop: 10 },
  cancelLinkText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
