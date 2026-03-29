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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { liveFastQueryOptions } from "@/lib/liveQuery";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";

const STATUS_STEPS = [
  { key: "requested", label: "Requested", icon: "document-text-outline" },
  { key: "accepted", label: "Accepted", icon: "checkmark-circle-outline" },
  { key: "on_the_way", label: "On the Way", icon: "car-outline" },
  { key: "arrived", label: "Arrived", icon: "location-outline" },
  { key: "in_progress", label: "In Progress", icon: "construct-outline" },
  { key: "completed", label: "Completed", icon: "trophy-outline" },
];

const STATUS_ORDER = ["requested", "matched", "accepted", "on_the_way", "arrived", "in_progress", "completed", "cancelled"];

export default function BookingDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get(`/bookings/${id}`),
    enabled: !!id,
    ...liveFastQueryOptions,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/bookings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: topPad }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.loading, { paddingTop: topPad }]}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(booking.status);
  const provider = booking.provider;
  const serviceRequest = booking.serviceRequest;

  const canPay = booking.status === "completed" && booking.paymentStatus === "pending";
  const canReview = booking.status === "completed" && booking.paymentStatus === "paid" && !booking.review;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <StatusBadge status={booking.status} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 120 }}
      >
        {/* Booking ID */}
        <View style={styles.bookingIdCard}>
          <Text style={styles.bookingIdLabel}>Booking Reference</Text>
          <Text style={styles.bookingId}>#{booking.id.slice(-10).toUpperCase()}</Text>
          <Text style={styles.bookingDate}>
            Scheduled: {new Date(booking.scheduledAt).toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })} at {new Date(booking.scheduledAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>

        {/* Progress Tracker */}
        {booking.status !== "cancelled" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Progress</Text>
            <View style={styles.progressTracker}>
              {STATUS_STEPS.map((step, i) => {
                const stepIdx = STATUS_ORDER.indexOf(step.key);
                const done = currentStepIndex >= stepIdx;
                const active = currentStepIndex === stepIdx;
                return (
                  <View key={step.key} style={styles.progressStep}>
                    <View style={[styles.progressDot, done && styles.progressDotDone, active && styles.progressDotActive]}>
                      <Ionicons
                        name={done ? "checkmark" : (step.icon as any)}
                        size={14}
                        color={done ? "#fff" : Colors.textTertiary}
                      />
                    </View>
                    <Text style={[styles.progressLabel, done && styles.progressLabelDone]}>{step.label}</Text>
                    {i < STATUS_STEPS.length - 1 && (
                      <View style={[styles.progressLine, done && styles.progressLineDone]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Provider Card */}
        {provider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Provider</Text>
            <TouchableOpacity
              style={styles.providerCard}
              onPress={() => router.push(`/provider/${provider.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.providerAvatar}>
                <Text style={styles.providerInitial}>{provider.businessName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{provider.businessName}</Text>
                <View style={styles.ratingRow}>
                  <StarRating rating={provider.avgRating} size={13} />
                  <Text style={styles.ratingText}>{provider.avgRating.toFixed(1)}</Text>
                </View>
                <Text style={styles.providerMeta}>{provider.yearsExperience} years experience · {provider.totalJobs} jobs</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Job Details */}
        {serviceRequest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Details</Text>
            <View style={styles.detailCard}>
              {[
                { icon: "document-text-outline", label: "Title", value: serviceRequest.title },
                { icon: "information-circle-outline", label: "Description", value: serviceRequest.description },
                { icon: "location-outline", label: "Address", value: serviceRequest.address },
                { icon: "calendar-outline", label: "Preferred Date", value: serviceRequest.preferredDate },
                { icon: "time-outline", label: "Preferred Time", value: serviceRequest.preferredTime },
                { icon: "flash-outline", label: "Urgency", value: serviceRequest.urgency },
              ].map((row, i, arr) => (
                <View key={row.label}>
                  <View style={styles.detailRow}>
                    <Ionicons name={row.icon as any} size={16} color={Colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <Text style={styles.detailValue}>{row.value}</Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Amount</Text>
              <Text style={styles.paymentAmount}>
                {booking.finalPrice ? `MYR ${Number(booking.finalPrice).toFixed(2)}` : "To be determined"}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              <View style={[styles.payStatusBadge, { backgroundColor: booking.paymentStatus === "paid" ? Colors.success + "15" : Colors.warning + "15" }]}>
                <Text style={[styles.payStatusText, { color: booking.paymentStatus === "paid" ? Colors.success : Colors.warning }]}>
                  {booking.paymentStatus === "paid" ? "Paid" : "Pending"}
                </Text>
              </View>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Currency</Text>
              <Text style={styles.paymentValue}>Malaysian Ringgit (MYR)</Text>
            </View>
          </View>
        </View>

        {/* Review */}
        {booking.review && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <View style={styles.reviewCard}>
              <StarRating rating={booking.review.rating} size={18} />
              <Text style={styles.reviewComment}>{booking.review.comment}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      {(canPay || canReview || booking.status === "requested") && (
        <View style={[styles.footer, { paddingBottom: botPad + 16 }]}>
          {canPay && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => router.push(`/payment/${booking.id}` as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={styles.payBtnText}>Pay MYR {Number(booking.finalPrice || 150).toFixed(2)}</Text>
            </TouchableOpacity>
          )}
          {canReview && (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => router.push(`/review/${booking.id}` as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="star-outline" size={20} color={Colors.primary} />
              <Text style={styles.reviewBtnText}>Leave a Review</Text>
            </TouchableOpacity>
          )}
          {booking.status === "requested" && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => Alert.alert("Cancel Booking", "Are you sure?", [
                { text: "No", style: "cancel" },
                { text: "Yes, Cancel", style: "destructive", onPress: () => updateStatus("cancelled") },
              ])}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, flex: 1 },
  bookingIdCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  bookingIdLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 },
  bookingId: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", marginBottom: 4 },
  bookingDate: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 12 },
  progressTracker: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 0, borderWidth: 1, borderColor: Colors.border },
  progressStep: { flexDirection: "row", alignItems: "center", gap: 12, position: "relative" },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    zIndex: 1,
    flexShrink: 0,
  },
  progressDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressDotActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  progressLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
  progressLabelDone: { fontFamily: "Inter_600SemiBold", color: Colors.text },
  progressLine: { position: "absolute", left: 15, top: 36, width: 2, height: 24, backgroundColor: Colors.border },
  progressLineDone: { backgroundColor: Colors.primary },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
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
  },
  providerInitial: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },
  providerName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, marginBottom: 3 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  ratingText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text },
  providerMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  detailCard: { backgroundColor: Colors.card, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  detailRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14 },
  detailLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  detailValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 42 },
  paymentCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  paymentLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  paymentAmount: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },
  paymentValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  payStatusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  payStatusText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  reviewCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  reviewComment: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  footer: { paddingHorizontal: 16, paddingTop: 12, gap: 10, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  payBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary + "12",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  reviewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.primary },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.error + "40",
  },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.error },
});
