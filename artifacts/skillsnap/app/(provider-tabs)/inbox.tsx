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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { liveListQueryOptions } from "@/lib/liveQuery";

const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";

export default function ProviderInbox() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: inbox = [], isLoading, refetch } = useQuery({
    queryKey: ["provider-inbox"],
    queryFn: () => api.get("/provider/inbox"),
    ...liveListQueryOptions,
    retry: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAccept = async (bookingId: string) => {
    setAccepting(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: "accepted" });
      qc.invalidateQueries({ queryKey: ["provider-inbox"] });
      qc.invalidateQueries({ queryKey: ["provider-dashboard"] });
      Alert.alert("Accepted!", "You've accepted this booking. The customer has been notified.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to accept booking");
    } finally {
      setAccepting(null);
    }
  };

  const handleDecline = (bookingId: string) => {
    Alert.alert("Decline Request", "Are you sure you want to decline this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            await api.patch(`/bookings/${bookingId}/status`, { status: "cancelled" });
            qc.invalidateQueries({ queryKey: ["provider-inbox"] });
            qc.invalidateQueries({ queryKey: ["provider-dashboard"] });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const urgencyConfig = (u: string) => {
    if (u === "emergency") return { color: "#DC2626", bg: "#FEE2E2", label: "Emergency" };
    if (u === "high") return { color: "#D97706", bg: "#FEF3C7", label: "High" };
    if (u === "medium") return { color: "#2563EB", bg: "#EFF6FF", label: "Medium" };
    return { color: "#64748B", bg: "#F1F5F9", label: "Low" };
  };

  const renderItem = ({ item }: { item: any }) => {
    const req = item.serviceRequest || {};
    const scheduledDate = new Date(item.scheduledAt);
    const isAccepting = accepting === item.id;
    const urg = urgencyConfig(req.urgency || "low");

    return (
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.categoryPill}>
              <Feather name="tag" size={11} color={P_COLOR} />
              <Text style={styles.categoryText}>{req.category?.name || "Service"}</Text>
            </View>
            <View style={[styles.urgencyPill, { backgroundColor: urg.bg }]}>
              <View style={[styles.urgencyDot, { backgroundColor: urg.color }]} />
              <Text style={[styles.urgencyText, { color: urg.color }]}>{urg.label}</Text>
            </View>
          </View>

          <Text style={styles.jobTitle} numberOfLines={2}>{req.title || "Service Request"}</Text>
          {req.description ? (
            <Text style={styles.jobDesc} numberOfLines={2}>{req.description}</Text>
          ) : null}

          <View style={styles.metaSection}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={13} color={Colors.textTertiary} />
              <Text style={styles.metaText}>
                {scheduledDate.toLocaleDateString("en-MY", { weekday: "short", month: "short", day: "numeric" })}
                {" · "}
                {scheduledDate.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            {req.address && (
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={13} color={Colors.textTertiary} />
                <Text style={styles.metaText} numberOfLines={1}>{req.address}</Text>
              </View>
            )}
          </View>

          {item.consumer && (
            <View style={styles.consumerRow}>
              <View style={styles.consumerAvatar}>
                <Text style={styles.consumerInitial}>{item.consumer.fullName?.[0] || "C"}</Text>
              </View>
              <View>
                <Text style={styles.consumerLabel}>Requested by</Text>
                <Text style={styles.consumerName}>{item.consumer.fullName}</Text>
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleDecline(item.id)}
              disabled={!!accepting}
            >
              <Feather name="x" size={16} color={Colors.error} />
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, isAccepting && { opacity: 0.7 }]}
              onPress={() => handleAccept(item.id)}
              disabled={!!accepting}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.acceptBtnText}>Accept Job</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F0FDF4" }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Request Inbox</Text>
          <Text style={styles.headerSub}>
            {inbox.length > 0 ? `${inbox.length} pending request${inbox.length > 1 ? "s" : ""}` : "All caught up"}
          </Text>
        </View>
        {inbox.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{inbox.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={P_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={inbox}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 100, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="inbox" size={32} color={P_ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptyText}>
                New service requests will appear here. Pull down to refresh.
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: P_COLOR,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  countBadge: {
    backgroundColor: "#DC2626",
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: P_COLOR,
  },
  countText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: { width: 5, backgroundColor: P_ACCENT },
  cardBody: { flex: 1, padding: 16 },
  cardTop: { flexDirection: "row", gap: 8, marginBottom: 10, alignItems: "center" },
  categoryPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: P_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  categoryText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: P_COLOR },
  urgencyPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  jobTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 6 },
  jobDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  metaSection: { gap: 6, marginBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  consumerRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
  },
  consumerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center",
  },
  consumerInitial: { fontFamily: "Inter_700Bold", fontSize: 15, color: P_ACCENT },
  consumerLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary },
  consumerName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  actions: { flexDirection: "row", gap: 10 },
  declineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.error + "40",
    backgroundColor: Colors.error + "08",
  },
  declineBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.error },
  acceptBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 13, borderRadius: 12,
    backgroundColor: P_ACCENT,
  },
  acceptBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
