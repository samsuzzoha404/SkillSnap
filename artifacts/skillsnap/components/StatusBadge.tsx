import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: Colors.warning, bg: Colors.warning + "15" },
  matched: { label: "Matched", color: Colors.primaryLight, bg: Colors.primaryLight + "15" },
  booked: { label: "Booked", color: Colors.primary, bg: Colors.primary + "15" },
  requested: { label: "Requested", color: Colors.warning, bg: Colors.warning + "15" },
  accepted: { label: "Accepted", color: Colors.primary, bg: Colors.primary + "15" },
  on_the_way: { label: "On the Way", color: Colors.primaryLight, bg: Colors.primaryLight + "15" },
  arrived: { label: "Arrived", color: Colors.accent, bg: Colors.accent + "15" },
  in_progress: { label: "In Progress", color: Colors.accent, bg: Colors.accent + "15" },
  completed: { label: "Completed", color: Colors.success, bg: Colors.success + "15" },
  cancelled: { label: "Cancelled", color: Colors.error, bg: Colors.error + "15" },
  verified: { label: "Verified", color: Colors.success, bg: Colors.success + "15" },
  pending_verification: { label: "Pending", color: Colors.warning, bg: Colors.warning + "15" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: Colors.textSecondary, bg: Colors.border };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
