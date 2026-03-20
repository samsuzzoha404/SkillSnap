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
    refetchInterval: 30000,
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={P_ACCENT} />
      </View>
    );
  }

  const urgencyColor = (u: string) =>
    u === "urgent" ? "#DC2626" : u === "high" ? "#D97706" : u === "medium" ? "#2563EB" : "#64748B";

  const renderItem = ({ item }: { item: any }) => {
    const req = item.serviceRequest || {};
    const scheduledDate = new Date(item.scheduledAt);
    const isAccepting = accepting === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{req.category?.name || "Service"}</Text>
          </View>
          {req.urgency && (
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor(req.urgency) + "15" }]}>
              <View style={[styles.urgencyDot, { backgroundColor: urgencyColor(req.urgency) }]} />
              <Text style={[styles.urgencyText, { color: urgencyColor(req.urgency) }]}>
                {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>{req.title || "Service Request"}</Text>
        {req.description ? (
          <Text style={styles.jobDesc} numberOfLines={2}>{req.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Feather name="calendar" size={13} color={Colors.textTertiary} />
          <Text style={styles.metaText}>
            {scheduledDate.toLocaleDateString("en-MY", { weekday: "short", month: "short", day: "numeric" })}
            {" at "}
            {scheduledDate.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>

        {req.address && (
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText} numberOfLines={1}>{req.address}</Text>
          </View>
        )}

        {item.consumer && (
          <View style={styles.consumerRow}>
            <View style={styles.consumerAvatar}>
              <Text style={styles.consumerInitial}>{item.consumer.fullName?.[0] || "C"}</Text>
            </View>
            <Text style={styles.consumerName}>{item.consumer.fullName}</Text>
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
                <Text style={styles.acceptBtnText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={styles.headerTitle}>Request Inbox</Text>
        {inbox.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{inbox.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={inbox}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 100, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_ACCENT} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={52} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptyText}>
              New service requests will appear here. Pull to refresh.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  countBadge: {
    backgroundColor: "#DC2626",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  categoryBadge: {
    backgroundColor: P_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#0D5C3A" },
  urgencyBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  jobTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 6 },
  jobDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  consumerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  consumerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + "15", alignItems: "center", justifyContent: "center" },
  consumerInitial: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.primary },
  consumerName: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  actions: { flexDirection: "row", gap: 12 },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.error + "40",
    backgroundColor: Colors.error + "08",
  },
  declineBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.error },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#10B981",
  },
  acceptBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
