import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { liveListQueryOptions } from "@/lib/liveQuery";
import { StarRating } from "@/components/StarRating";

export default function ProviderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider", id],
    queryFn: () => api.get(`/providers/${id}`),
    enabled: !!id,
    ...liveListQueryOptions,
  });

  const { mutate: quickBook, isPending: isBooking } = useMutation({
    mutationFn: () =>
      api.post("/service-requests", {
        categoryId: provider?.categories?.[0]?.id,
        title: `Service request for ${provider?.businessName}`,
        description: `Requesting service from ${provider?.businessName}.`,
        address: "KLCC, Kuala Lumpur",
        latitude: 3.1578,
        longitude: 101.7123,
        preferredDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        preferredTime: "10:00",
        urgency: "medium",
      }),
    onSuccess: (data) => {
      router.push(`/request/matches?requestId=${data.id}` as any);
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Could not create request"),
  });

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: topPad }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.loading, { paddingTop: topPad }]}>
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.textSecondary }}>Provider not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 120 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{provider.businessName[0]}</Text>
          </View>
          <Text style={styles.businessName}>{provider.businessName}</Text>
          <Text style={styles.fullName}>{provider.fullName}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={provider.avgRating} size={16} />
            <Text style={styles.ratingText}>{provider.avgRating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({provider.totalJobs} reviews)</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
            <Text style={styles.verifiedText}>Verified Provider</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Jobs Done", value: provider.totalJobs, icon: "briefcase" },
            { label: "Completion", value: `${Math.round(provider.completionRate)}%`, icon: "checkmark-circle" },
            { label: "Acceptance", value: `${Math.round(provider.acceptanceRate)}%`, icon: "thumbs-up" },
            { label: "Experience", value: `${provider.yearsExperience}yrs`, icon: "time" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={18} color={Colors.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.bioText}>{provider.bio}</Text>
          </View>
        </View>

        {/* Services */}
        {provider.categories?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <View style={styles.card}>
              {provider.categories.map((cat: any, i: number, arr: any[]) => (
                <View key={cat.id}>
                  <View style={styles.serviceRow}>
                    <View style={styles.serviceIcon}>
                      <Ionicons name="construct-outline" size={18} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{cat.name}</Text>
                      {cat.description && (
                        <Text style={styles.serviceDesc} numberOfLines={1}>{cat.description}</Text>
                      )}
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Info</Text>
          <View style={styles.card}>
            {[
              { icon: "call-outline", label: "Phone", value: provider.phone || "+60 XX XXXX XXXX" },
              { icon: "mail-outline", label: "Email", value: provider.email },
              { icon: "location-outline", label: "Service Radius", value: `${provider.serviceRadiusKm} km from base` },
            ].map((row, i, arr) => (
              <View key={row.label}>
                <View style={styles.infoRow}>
                  <Ionicons name={row.icon as any} size={16} color={Colors.primary} />
                  <View>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Reviews */}
        {provider.recentReviews?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {provider.recentReviews.map((review: any) => (
              <View key={review.id} style={[styles.card, { marginBottom: 12 }]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewInitial}>{review.consumerName?.[0] || "U"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{review.consumerName || "Anonymous"}</Text>
                    <StarRating rating={review.rating} size={13} />
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString("en-MY", { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 16 }]}>
        <TouchableOpacity
          style={[styles.bookBtn, isBooking && { opacity: 0.7 }]}
          onPress={() => quickBook()}
          disabled={isBooking}
          activeOpacity={0.85}
        >
          {isBooking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.bookBtnText}>Book This Provider</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.background },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  hero: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 24, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary + "20", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.primary },
  businessName: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, textAlign: "center", marginBottom: 2 },
  fullName: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textSecondary, marginBottom: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  ratingText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  reviewCount: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.success + "12", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  verifiedText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.success },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 12 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  bioText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  serviceIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  serviceName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  serviceDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 6 },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  infoValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, marginTop: 2 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  reviewInitial: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.primary },
  reviewName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 3 },
  reviewDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textTertiary },
  reviewComment: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 14,
  },
  bookBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
