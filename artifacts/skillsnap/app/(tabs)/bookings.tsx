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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

const TABS = ["All", "Active", "Completed", "Cancelled"];

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get("/bookings"),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = bookings.filter((b: any) => {
    if (activeTab === "All") return true;
    if (activeTab === "Active") return ["requested", "matched", "accepted", "on_the_way", "arrived", "in_progress"].includes(b.status);
    if (activeTab === "Completed") return b.status === "completed";
    if (activeTab === "Cancelled") return b.status === "cancelled";
    return true;
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/booking/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.bookingIdRow}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.primary + "15" }]}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.bookingId}>#{item.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.dateText}>
              {new Date(item.scheduledAt).toLocaleDateString("en-MY", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.footerText}>
            {new Date(item.scheduledAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        {item.finalPrice && (
          <Text style={styles.priceText}>MYR {Number(item.finalPrice).toFixed(2)}</Text>
        )}
        {item.paymentStatus === "pending" && item.status === "completed" && (
          <TouchableOpacity
            style={styles.payNowBtn}
            onPress={() => router.push(`/payment/${item.id}` as any)}
          >
            <Text style={styles.payNowText}>Pay Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptyText}>Your bookings will appear here</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push("/request/create" as any)}
              >
                <Text style={styles.emptyBtnText}>Book a Service</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 12, backgroundColor: Colors.background },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { color: "#fff" },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bookingIdRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bookingId: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  dateText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  priceText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  payNowBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payNowText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});
