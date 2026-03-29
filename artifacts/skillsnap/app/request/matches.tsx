import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { liveFastQueryOptions } from "@/lib/liveQuery";
import { StarRating } from "@/components/StarRating";

export default function MatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [bookingProviderId, setBookingProviderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", requestId],
    queryFn: () => api.get(`/matching/${requestId}`),
    enabled: !!requestId,
    ...liveFastQueryOptions,
  });

  const { mutate: createBooking } = useMutation({
    mutationFn: ({ providerId }: { providerId: string }) =>
      api.post("/bookings", {
        serviceRequestId: requestId,
        providerId,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["matches", requestId] });
      setBookingProviderId(null);
      router.replace(`/booking/${data.id}` as any);
    },
    onError: (err: any) => {
      setBookingProviderId(null);
      Alert.alert("Error", err.message || "Booking failed. Please try again.");
    },
  });

  const handleBook = (provider: any) => {
    Alert.alert(
      "Confirm Booking",
      `Book ${provider.businessName} for estimated MYR ${provider.estimatedPrice?.toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Book Now",
          onPress: () => {
            setBookingProviderId(provider.id);
            createBooking({ providerId: provider.id });
          },
        },
      ]
    );
  };

  const renderMatch = ({ item, index }: { item: any; index: number }) => {
    const isTop = index === 0;
    const isThisBooking = bookingProviderId === item.id;
    const anyBooking = bookingProviderId !== null;

    return (
      <TouchableOpacity
        style={[styles.card, isTop && styles.cardTop, selectedProvider === item.id && styles.cardSelected]}
        onPress={() => setSelectedProvider(item.id === selectedProvider ? null : item.id)}
        activeOpacity={0.85}
      >
        {isTop && (
          <View style={styles.topBadge}>
            <Ionicons name="trophy" size={13} color="#fff" />
            <Text style={styles.topBadgeText}>Best Match</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.businessName[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.businessName}>{item.businessName}</Text>
            <View style={styles.ratingRow}>
              <StarRating rating={item.avgRating} size={13} />
              <Text style={styles.ratingText}>{item.avgRating.toFixed(1)}</Text>
              <Text style={styles.jobsText}>· {item.totalJobs} jobs</Text>
            </View>
            <View style={styles.tagsRow}>
              {item.categories?.slice(0, 2).map((cat: any) => (
                <View key={cat.id} style={styles.tag}>
                  <Text style={styles.tagText}>{cat.name}</Text>
                </View>
              ))}
              <View style={[styles.tag, { backgroundColor: Colors.success + "15" }]}>
                <Ionicons name="shield-checkmark" size={11} color={Colors.success} />
                <Text style={[styles.tagText, { color: Colors.success }]}>Verified</Text>
              </View>
            </View>
          </View>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreText}>{Math.round(item.matchScore * 100)}</Text>
            <Text style={styles.scoreLabel}>score</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          {[
            { icon: "location-outline", value: `${item.distance?.toFixed(1) || "~5"} km away` },
            { icon: "time-outline", value: `${item.yearsExperience}yr exp` },
            { icon: "checkmark-circle-outline", value: `${Math.round(item.completionRate)}% complete` },
          ].map((info) => (
            <View key={info.icon} style={styles.infoItem}>
              <Ionicons name={info.icon as any} size={13} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{info.value}</Text>
            </View>
          ))}
        </View>

        {selectedProvider === item.id && (
          <View style={styles.expanded}>
            <Text style={styles.bioText} numberOfLines={3}>{item.bio}</Text>
            {item.email && (
              <Text style={[styles.bioText, { marginTop: -4 }]}>
                Provider account: {item.email}
              </Text>
            )}
            <View style={styles.scoreBreakdown}>
              <Text style={styles.breakdownTitle}>Match Score Breakdown</Text>
              {Object.entries(item.scoreBreakdown || {}).map(([key, val]: [string, any]) => (
                <View key={key} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{key.replace("Score", "").replace(/([A-Z])/g, " $1")}</Text>
                  <View style={styles.breakdownBarWrap}>
                    <View style={[styles.breakdownBar, { width: `${Math.round(val * 100)}%` }]} />
                  </View>
                  <Text style={styles.breakdownVal}>{Math.round(val * 100)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceLabel}>Estimated</Text>
            <Text style={styles.priceValue}>MYR {item.estimatedPrice?.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, anyBooking && styles.bookBtnDisabled]}
            onPress={() => handleBook(item)}
            disabled={anyBooking}
            activeOpacity={0.85}
          >
            {isThisBooking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.bookBtnText}>Book Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Matched Providers</Text>
          <Text style={styles.headerSub}>
            {isLoading ? "Finding best matches..." : `${matches.length} providers ranked by AI`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>AI is analyzing and ranking providers...</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad + 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptyText}>Try adjusting your location or service type</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.background },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cardTop: { borderColor: Colors.primary, borderWidth: 2 },
  cardSelected: { borderColor: Colors.primary },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  topBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  cardHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },
  businessName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 3 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  ratingText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text },
  jobsText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary + "30",
    flexShrink: 0,
  },
  scoreText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.primary },
  scoreLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textSecondary },
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  expanded: { marginBottom: 12 },
  bioText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  scoreBreakdown: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12 },
  breakdownTitle: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text, marginBottom: 8 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  breakdownLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, width: 90, textTransform: "capitalize" },
  breakdownBarWrap: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  breakdownBar: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  breakdownVal: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.primary, width: 32, textAlign: "right" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  priceLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  priceValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.primary },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookBtnDisabled: { opacity: 0.7 },
  bookBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
});
