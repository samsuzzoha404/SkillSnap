import React, { useState } from "react";
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

const PAYMENT_METHODS = [
  { id: "fpx", name: "FPX Online Banking", icon: "business-outline", desc: "All Malaysian banks supported" },
  { id: "card", name: "Credit / Debit Card", icon: "card-outline", desc: "Visa, Mastercard, AmEx" },
  { id: "ewallet", name: "eWallet", icon: "wallet-outline", desc: "Touch 'n Go, GrabPay, Boost" },
];

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState("fpx");
  const [processing, setProcessing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: booking } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}`),
    enabled: !!bookingId,
    ...liveFastQueryOptions,
  });

  const amount = booking?.finalPrice || 150;

  const { mutate: pay } = useMutation({
    mutationFn: () =>
      api.post(`/payments/${bookingId}/pay`, { amount, method: selectedMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setProcessing(false);
      Alert.alert(
        "Payment Successful",
        `MYR ${Number(amount).toFixed(2)} paid successfully. Thank you!`,
        [{ text: "Done", onPress: () => router.replace(`/booking/${bookingId}` as any) }]
      );
    },
    onError: (err: any) => {
      setProcessing(false);
      Alert.alert("Payment Failed", err.message);
    },
  });

  const handlePay = () => {
    Alert.alert(
      "Confirm Payment",
      `Pay MYR ${Number(amount).toFixed(2)} via ${PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          onPress: () => {
            setProcessing(true);
            pay();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: botPad + 120 }}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={28} color="#fff" />
          </View>
          <Text style={styles.amountLabel}>Total Amount Due</Text>
          <Text style={styles.amountValue}>MYR {Number(amount).toFixed(2)}</Text>
          <Text style={styles.amountSub}>Secure payment powered by SkillSnap Pay</Text>
        </View>

        {/* Booking Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Booking ID</Text>
              <Text style={styles.summaryValue}>#{bookingId?.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>
                {booking?.serviceRequest?.category?.name || "Professional Service"}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Provider</Text>
              <Text style={styles.summaryValue}>{booking?.provider?.businessName || "Provider"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontFamily: "Inter_700Bold" }]}>Total (MYR)</Text>
              <Text style={[styles.summaryValue, { fontFamily: "Inter_700Bold", color: Colors.primary, fontSize: 18 }]}>
                {Number(amount).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, selectedMethod === method.id && styles.methodCardSelected]}
              onPress={() => setSelectedMethod(method.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.methodIcon, { backgroundColor: selectedMethod === method.id ? Colors.primary + "15" : Colors.surface }]}>
                <Ionicons name={method.icon as any} size={22} color={selectedMethod === method.id ? Colors.primary : Colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodName, selectedMethod === method.id && { color: Colors.primary }]}>
                  {method.name}
                </Text>
                <Text style={styles.methodDesc}>{method.desc}</Text>
              </View>
              <View style={[styles.radioOuter, selectedMethod === method.id && styles.radioOuterSelected]}>
                {selectedMethod === method.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security note */}
        <View style={styles.section}>
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
            <Text style={styles.securityText}>
              Your payment is secured with bank-level 256-bit SSL encryption. SkillSnap never stores your card details.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 16 }]}>
        <TouchableOpacity
          style={[styles.payBtn, processing && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#fff" />
              <Text style={styles.payBtnText}>Pay MYR {Number(amount).toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.background },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  amountCard: {
    margin: 16,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  amountLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)" },
  amountValue: { fontFamily: "Inter_700Bold", fontSize: 40, color: "#fff" },
  amountSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 12 },
  summaryCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  methodCardSelected: { borderColor: Colors.primary },
  methodIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  methodName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 2 },
  methodDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.primary },
  securityNote: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.success + "10",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  securityText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18, flex: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 14,
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
