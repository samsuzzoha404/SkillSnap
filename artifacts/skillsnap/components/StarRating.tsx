import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

interface StarRatingProps {
  rating: number;
  size?: number;
}

export function StarRating({ rating, size = 14 }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={rating >= star ? "star" : rating >= star - 0.5 ? "star-half" : "star-outline"}
          size={size}
          color={Colors.warning}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", gap: 2 } });
