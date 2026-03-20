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

const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";

function MonthBar({ month, amount, maxAmount }: { month: string; amount: number; maxAmount: number }) {
  const pct = maxAmount > 0 ? amount / maxAmount : 0;
  const label = new Date(month + "-01").toLocaleDateString("en-MY", { month: "short" });
  return (
    <View style={{ alignItems: "center", flex: 1, gap: 6 }}>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary }}>
        MYR {amount.toFixed(0)}
      </Text>
      <View style={{ height: 80, width: 24, backgroundColor: Colors.surface, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" }}>
        <View style={{ height: `${Math.round(pct * 100)}%`, backgroundColor: P_ACCENT, borderRadius: 6 }} />
      </View>
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary }}>{label}</Text>
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
    retry: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
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
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P_ACCENT} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Earned</Text>
          <Text style={styles.heroAmount}>MYR {totalEarnings.toFixed(2)}</Text>
          <Text style={styles.heroSub}>Across {totalJobs} completed {totalJobs === 1 ? "job" : "jobs"}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>MYR {paidEarnings.toFixed(2)}</Text>
              <Text style={styles.heroStatLabel}>Paid Out</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>MYR {pendingEarnings.toFixed(2)}</Text>
              <Text style={styles.heroStatLabel}>Pending</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>MYR {avgPerJob.toFixed(0)}</Text>
              <Text style={styles.heroStatLabel}>Avg/Job</Text>
            </View>
          </View>
        </View>

        {monthEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
            <View style={styles.chartCard}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", paddingHorizontal: 4 }}>
                {monthEntries.map(([month, amount]) => (
                  <MonthBar key={month} month={month} amount={amount as number} maxAmount={maxAmount} />
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            {[
              { icon: "check-circle", label: "Completed Jobs", value: totalJobs.toString(), color: P_ACCENT },
              { icon: "dollar-sign", label: "Average Per Job", value: `MYR ${avgPerJob.toFixed(2)}`, color: Colors.primary },
              { icon: "clock", label: "Pending Payment", value: `MYR ${pendingEarnings.toFixed(2)}`, color: "#D97706" },
              { icon: "trending-up", label: "Paid Earnings", value: `MYR ${paidEarnings.toFixed(2)}`, color: "#16A34A" },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryIcon, { backgroundColor: item.color + "15" }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {earnings?.recentBookings?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Earnings</Text>
            {earnings.recentBookings.map((b: any) => (
              <View key={b.id} style={styles.earningRow}>
                <View style={styles.earningLeft}>
                  <View style={[styles.earningIcon, { backgroundColor: b.paymentStatus === "paid" ? "#DCFCE7" : "#FEF3C7" }]}>
                    <Feather name="dollar-sign" size={16} color={b.paymentStatus === "paid" ? "#16A34A" : "#D97706"} />
                  </View>
                  <View>
                    <Text style={styles.earningDate}>
                      {b.completedAt
                        ? new Date(b.completedAt).toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </Text>
                    <View style={[styles.payBadge, { backgroundColor: b.paymentStatus === "paid" ? "#DCFCE7" : "#FEF3C7" }]}>
                      <Text style={[styles.payBadgeText, { color: b.paymentStatus === "paid" ? "#16A34A" : "#D97706" }]}>
                        {b.paymentStatus === "paid" ? "Paid" : "Pending"}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.earningAmount}>MYR {(b.finalPrice || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {totalJobs === 0 && (
          <View style={styles.empty}>
            <Feather name="dollar-sign" size={52} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptyText}>Complete your first job to start tracking earnings here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.background },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  heroCard: {
    backgroundColor: P_COLOR,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  heroLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8 },
  heroAmount: { fontFamily: "Inter_700Bold", fontSize: 38, color: "#fff", marginBottom: 4 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20 },
  heroStats: { flexDirection: "row", alignItems: "center" },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff", marginBottom: 2 },
  heroStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  heroStatDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 12 },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, flex: 1 },
  summaryValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  earningRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  earningLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  earningIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  earningDate: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text, marginBottom: 4 },
  payBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, alignSelf: "flex-start" },
  payBadgeText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  earningAmount: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
