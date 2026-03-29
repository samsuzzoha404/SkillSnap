import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { liveListQueryOptions } from "@/lib/liveQuery";

const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";
const P_MINT = "#A7F3D0";

function MonthBar({ month, amount, maxAmount }: { month: string; amount: number; maxAmount: number }) {
  const pct = maxAmount > 0 ? amount / maxAmount : 0;
  const label = new Date(month + "-01").toLocaleDateString("en-MY", { month: "short" });
  return (
    <View style={{ alignItems: "center", flex: 1, gap: 4 }}>
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textSecondary }}>
        {amount > 0 ? amount.toFixed(0) : ""}
      </Text>
      <View style={{ height: 72, width: 22, backgroundColor: "#E2E8F0", borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" }}>
        <View style={{ height: `${Math.round(pct * 100)}%`, backgroundColor: pct > 0.7 ? P_ACCENT : pct > 0.4 ? "#34D399" : "#6EE7B7", borderRadius: 6 }} />
      </View>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textTertiary }}>{label}</Text>
    </View>
  );
}

export default function ProviderEarnings() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: earnings, isLoading, refetch } = useQuery({
    queryKey: ["provider-earnings"],
    queryFn: () => api.get("/provider/earnings"),
    ...liveListQueryOptions,
    retry: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0FDF4" }}>
        <ActivityIndicator size="large" color={P_ACCENT} />
      </View>
    );
  }

  const byMonth = earnings?.byMonth || {};
  const monthEntries = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  const maxAmount = Math.max(...monthEntries.map(([, v]) => v as number), 1);

  const totalEarnings = earnings?.totalEarnings || 0;
  const paidEarnings = earnings?.paidEarnings || 0;
  const pendingEarnings = earnings?.pendingEarnings || 0;
  const totalJobs = earnings?.totalJobs || 0;
  const avgPerJob = totalJobs > 0 ? totalEarnings / totalJobs : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F0FDF4" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_MINT} />}
      >
        <View style={[styles.hero, { paddingTop: topPad + 12 }]}>
          <Text style={styles.heroLabel}>Total Earned</Text>
          <Text style={styles.heroAmount}>MYR {totalEarnings.toFixed(2)}</Text>
          <Text style={styles.heroSub}>From {totalJobs} completed {totalJobs === 1 ? "job" : "jobs"}</Text>

          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Feather name="check-circle" size={14} color={P_MINT} />
              <View>
                <Text style={styles.heroPillValue}>MYR {paidEarnings.toFixed(0)}</Text>
                <Text style={styles.heroPillLabel}>Paid Out</Text>
              </View>
            </View>
            <View style={styles.heroPillDivider} />
            <View style={styles.heroPill}>
              <Feather name="clock" size={14} color={P_MINT} />
              <View>
                <Text style={styles.heroPillValue}>MYR {pendingEarnings.toFixed(0)}</Text>
                <Text style={styles.heroPillLabel}>Pending</Text>
              </View>
            </View>
            <View style={styles.heroPillDivider} />
            <View style={styles.heroPill}>
              <Feather name="trending-up" size={14} color={P_MINT} />
              <View>
                <Text style={styles.heroPillValue}>MYR {avgPerJob.toFixed(0)}</Text>
                <Text style={styles.heroPillLabel}>Avg/Job</Text>
              </View>
            </View>
          </View>
        </View>

        {monthEntries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Monthly Earnings</Text>
            </View>
            <View style={styles.chartCard}>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-end", paddingHorizontal: 4 }}>
                {monthEntries.map(([month, amount]) => (
                  <MonthBar key={month} month={month} amount={amount as number} maxAmount={maxAmount} />
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Summary</Text>
          </View>
          <View style={styles.summaryCard}>
            {[
              { icon: "check-circle", label: "Completed Jobs", value: totalJobs.toString(), color: P_ACCENT },
              { icon: "dollar-sign", label: "Average Per Job", value: `MYR ${avgPerJob.toFixed(2)}`, color: "#2563EB" },
              { icon: "clock", label: "Pending Payment", value: `MYR ${pendingEarnings.toFixed(2)}`, color: "#D97706" },
              { icon: "trending-up", label: "Paid Earnings", value: `MYR ${paidEarnings.toFixed(2)}`, color: "#16A34A" },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryIcon, { backgroundColor: item.color + "15" }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {earnings?.recentBookings?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>
            {earnings.recentBookings.map((b: any) => (
              <View key={b.id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: b.paymentStatus === "paid" ? P_LIGHT : "#FEF3C7" }]}>
                  <Feather
                    name={b.paymentStatus === "paid" ? "check-circle" : "clock"}
                    size={16}
                    color={b.paymentStatus === "paid" ? P_ACCENT : "#D97706"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDate}>
                    {b.completedAt
                      ? new Date(b.completedAt).toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </Text>
                  <View style={[styles.txBadge, { backgroundColor: b.paymentStatus === "paid" ? P_LIGHT : "#FEF3C7" }]}>
                    <Text style={[styles.txBadgeText, { color: b.paymentStatus === "paid" ? P_ACCENT : "#D97706" }]}>
                      {b.paymentStatus === "paid" ? "Paid" : "Pending"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.txAmount}>MYR {(b.finalPrice || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {totalJobs === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="trending-up" size={32} color={P_ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptyText}>Complete your first job to start tracking earnings here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: P_COLOR,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 24,
  },
  heroLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 6 },
  heroAmount: { fontFamily: "Inter_700Bold", fontSize: 38, color: "#fff", marginBottom: 4 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 22 },
  heroPills: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 16, padding: 14, alignItems: "center",
  },
  heroPill: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  heroPillDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 4 },
  heroPillValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  heroPillLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: P_ACCENT },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  summaryIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, flex: 1 },
  summaryValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 66 },
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txDate: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text, marginBottom: 4 },
  txBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, alignSelf: "flex-start" },
  txBadgeText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: P_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
