import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const QUICK_TAGS = [
    "Professional", "On time", "Excellent work",
    "Clean & tidy", "Good value", "Would recommend",
    "Friendly", "Efficient",
  ];

  const { mutate: submitReview, isPending } = useMutation({
    mutationFn: () =>
      api.post("/reviews", { bookingId, rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      Alert.alert("Thank You!", "Your review has been submitted.", [
        { text: "Done", onPress: () => router.replace(`/booking/${bookingId}` as any) },
      ]);
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating.");
      return;
    }
    if (comment.trim().length < 5) {
      Alert.alert("Comment Required", "Please write at least a short comment.");
      return;
    }
    submitReview();
  };

  const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Experience</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: botPad + 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="star" size={36} color={Colors.warning} />
          </View>
          <Text style={styles.heroTitle}>How was your experience?</Text>
          <Text style={styles.heroSub}>Your honest feedback helps improve the platform and recognizes great service providers.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={rating >= star ? "star" : "star-outline"}
                  size={48}
                  color={rating >= star ? Colors.warning : Colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tags</Text>
          <View style={styles.tagsGrid}>
            {QUICK_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagBtn,
                  comment.includes(tag) && styles.tagBtnSelected,
                ]}
                onPress={() => {
                  if (comment.includes(tag)) {
                    setComment(comment.replace(tag, "").replace(", ,", ",").replace(/^, /, "").replace(/, $/, "").trim());
                  } else {
                    setComment(comment ? `${comment}, ${tag}` : tag);
                  }
                }}
              >
                <Text style={[styles.tagText, comment.includes(tag) && styles.tagTextSelected]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Write a Comment</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your experience with this provider. What went well? What could be improved?"
            placeholderTextColor={Colors.textTertiary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 16 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, (isPending || rating === 0) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isPending || rating === 0}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Review</Text>
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
  heroCard: {
    margin: 16,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.warning + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text, textAlign: "center" },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 14 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 10 },
  ratingLabel: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.warning, textAlign: "center" },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tagBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tagBtnSelected: { backgroundColor: Colors.primary + "12", borderColor: Colors.primary },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tagTextSelected: { color: Colors.primary },
  commentInput: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    height: 130,
  },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, textAlign: "right", marginTop: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 14,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
