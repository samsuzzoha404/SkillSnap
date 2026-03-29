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
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { liveListQueryOptions } from "@/lib/liveQuery";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";

const CATEGORY_ICONS: Record<string, any> = {
  Electrical: "flash",
  Plumbing: "water",
  Cleaning: "sparkles",
  Automotive: "car",
  "Air Conditioning": "thermometer",
  Carpentry: "construct",
  Painting: "brush",
  Security: "shield-checkmark",
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: categories = [], refetch: refetchCats } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories"),
    ...liveListQueryOptions,
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get("/bookings"),
    ...liveListQueryOptions,
    enabled: !!token,
    retry: false,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.get("/providers"),
    ...liveListQueryOptions,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCats(), refetchBookings()]);
    setRefreshing(false);
  };

  const activeBookings = bookings.filter((b: any) =>
    ["requested", "matched", "accepted", "on_the_way", "arrived", "in_progress"].includes(b.status)
  );

  const firstName = user?.fullName?.split(" ")[0] || "there";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 17) return "Good afternoon,";
    return "Good evening,";
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/notifications" as any)} style={styles.notifBtn}>
          <Feather name="bell" size={22} color={Colors.text} />
          {bookings.filter((b: any) => b.status === "accepted").length > 0 && (
            <View style={styles.notifDot} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Hero CTA */}
        <View style={styles.heroCTA}>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Need a skilled professional?</Text>
            <Text style={styles.heroTitle}>Book a Service</Text>
            <Text style={styles.heroSub}>200+ verified experts across KL</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="flash" size={36} color="#fff" />
          </View>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => router.push("/request/create" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.heroBtnText}>Get Matched Now</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Active Bookings */}
        {activeBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Bookings</Text>
            {activeBookings.slice(0, 2).map((booking: any) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.activeBookingCard}
                onPress={() => router.push(`/booking/${booking.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.activeBookingLeft}>
                  <View style={[styles.activeBookingIcon, { backgroundColor: Colors.primary + "15" }]}>
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.activeBookingId}>Booking #{booking.id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.activeBookingDate}>
                      {new Date(booking.scheduledAt).toLocaleDateString("en-MY", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
                <StatusBadge status={booking.status} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => router.push("/request/create" as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.catIconWrap, { backgroundColor: Colors.primary + "12" }]}>
                  <Ionicons
                    name={(CATEGORY_ICONS[cat.name] || "construct") as any}
                    size={26}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Top Providers */}
        {providers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Providers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
              {providers.slice(0, 6).map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.providerCard}
                  onPress={() => router.push(`/provider/${p.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.providerAvatar}>
                    <Text style={styles.providerInitial}>{p.businessName[0]}</Text>
                  </View>
                  <View style={[styles.verifiedBadge]}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  </View>
                  <Text style={styles.providerName} numberOfLines={1}>{p.businessName}</Text>
                  <View style={styles.providerRatingRow}>
                    <StarRating rating={p.avgRating} size={12} />
                    <Text style={styles.providerRatingText}>{p.avgRating.toFixed(1)}</Text>
                  </View>
                  {p.categories?.[0] && (
                    <Text style={styles.providerCategory} numberOfLines={1}>{p.categories[0].name}</Text>
                  )}
                  <Text style={styles.providerPrice}>
                    MYR {p.basePrice}/{p.priceType === "hourly" ? "hr" : "job"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: "Verified Providers", value: "200+", icon: "shield-checkmark" },
            { label: "Completed Jobs", value: "5,000+", icon: "checkmark-circle" },
            { label: "Avg Rating", value: "4.8★", icon: "star" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={20} color={Colors.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: botPad + 80 }]}
        onPress={() => router.push("/request/create" as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
  heroCTA: {
    marginHorizontal: 24,
    marginBottom: 28,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    overflow: "hidden",
  },
  heroContent: { marginBottom: 16 },
  heroLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff", marginBottom: 4 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.75)" },
  heroIcon: {
    position: "absolute",
    top: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  heroBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  section: { paddingHorizontal: 24, marginBottom: 28 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 16 },
  activeBookingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeBookingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  activeBookingIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activeBookingId: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  activeBookingDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  categoryCard: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexGrow: 1,
  },
  catIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  catName: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.text, textAlign: "center" },
  providerCard: {
    width: 150,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    marginLeft: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  providerInitial: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },
  verifiedBadge: { position: "absolute", top: 28, left: 42 },
  providerName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 4 },
  providerRatingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  providerRatingText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  providerCategory: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginBottom: 6 },
  providerPrice: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 24, marginBottom: 32 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  fab: {
    position: "absolute",
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
