import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { liveListQueryOptions } from "@/lib/liveQuery";

const URGENCY_OPTIONS = [
  { value: "low", label: "Low", desc: "No rush", color: Colors.success },
  { value: "medium", label: "Medium", desc: "Within a week", color: Colors.warning },
  { value: "high", label: "High", desc: "Within 2 days", color: Colors.accent },
  { value: "emergency", label: "Emergency", desc: "ASAP", color: Colors.error },
];

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

const KL_ADDRESSES = [
  { name: "KLCC, Kuala Lumpur", lat: 3.1578, lng: 101.7123 },
  { name: "Bangsar, Kuala Lumpur", lat: 3.1299, lng: 101.6713 },
  { name: "Mont Kiara, Kuala Lumpur", lat: 3.1717, lng: 101.6488 },
  { name: "Petaling Jaya, Selangor", lat: 3.1073, lng: 101.6065 },
  { name: "Subang Jaya, Selangor", lat: 3.0507, lng: 101.5802 },
  { name: "Cheras, Kuala Lumpur", lat: 3.0912, lng: 101.7503 },
  { name: "Damansara, Kuala Lumpur", lat: 3.1565, lng: 101.6201 },
];

export default function CreateRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [selectedAddress, setSelectedAddress] = useState(KL_ADDRESSES[0]);
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [preferredTime, setPreferredTime] = useState("10:00");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories"),
    ...liveListQueryOptions,
  });

  const { mutate: createRequest, isPending } = useMutation({
    mutationFn: () =>
      api.post("/service-requests", {
        categoryId,
        title,
        description,
        address: selectedAddress.name,
        latitude: selectedAddress.lat,
        longitude: selectedAddress.lng,
        preferredDate,
        preferredTime,
        urgency,
      }),
    onSuccess: (data) => {
      router.replace(`/request/matches?requestId=${data.id}` as any);
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to create request");
    },
  });

  const canProceedStep1 = !!categoryId;
  const canProceedStep2 = title.trim().length >= 5 && description.trim().length >= 10;
  const canProceedStep3 = !!urgency && !!selectedAddress;

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What service do you need?</Text>
      <Text style={styles.stepSubtitle}>Select a category to get started</Text>
      <View style={styles.catGrid}>
        {categories.map((cat: any) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catCard, categoryId === cat.id && styles.catCardSelected]}
            onPress={() => setCategoryId(cat.id)}
            activeOpacity={0.75}
          >
            <View style={[styles.catIcon, { backgroundColor: categoryId === cat.id ? Colors.primary : Colors.primary + "12" }]}>
              <Ionicons
                name={(CATEGORY_ICONS[cat.name] || "construct") as any}
                size={26}
                color={categoryId === cat.id ? "#fff" : Colors.primary}
              />
            </View>
            <Text style={[styles.catLabel, categoryId === cat.id && styles.catLabelSelected]}>{cat.name}</Text>
            {categoryId === cat.id && (
              <View style={styles.catCheck}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Describe the job</Text>
      <Text style={styles.stepSubtitle}>Help the provider understand what you need</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Job Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fix leaking pipe under kitchen sink"
          placeholderTextColor={Colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />
        <Text style={styles.charCount}>{title.length}/80</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the issue in detail, include what you've already tried, any specific requirements..."
          placeholderTextColor={Colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Schedule & Location</Text>
      <Text style={styles.stepSubtitle}>When and where do you need the service?</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Urgency Level</Text>
        <View style={styles.urgencyGrid}>
          {URGENCY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.urgencyCard, urgency === opt.value && { borderColor: opt.color, backgroundColor: opt.color + "10" }]}
              onPress={() => setUrgency(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.urgencyLabel, urgency === opt.value && { color: opt.color }]}>{opt.label}</Text>
              <Text style={styles.urgencyDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Preferred Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textTertiary}
          value={preferredDate}
          onChangeText={setPreferredDate}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Preferred Time</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:MM (e.g. 10:00)"
          placeholderTextColor={Colors.textTertiary}
          value={preferredTime}
          onChangeText={setPreferredTime}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Service Address</Text>
        <View style={styles.addressList}>
          {KL_ADDRESSES.map((addr) => (
            <TouchableOpacity
              key={addr.name}
              style={[styles.addressRow, selectedAddress.name === addr.name && styles.addressRowSelected]}
              onPress={() => setSelectedAddress(addr)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="location"
                size={18}
                color={selectedAddress.name === addr.name ? Colors.primary : Colors.textTertiary}
              />
              <Text style={[styles.addressText, selectedAddress.name === addr.name && { color: Colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                {addr.name}
              </Text>
              {selectedAddress.name === addr.name && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: "auto" }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Book a Service</Text>
          <Text style={styles.headerSub}>Step {step} of 3</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressSegment, s <= step && styles.progressSegmentActive]} />
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: botPad + 16 }]}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) ? styles.nextBtnDisabled : null,
          ]}
          onPress={() => {
            if (step < 3) setStep(step + 1);
            else createRequest();
          }}
          disabled={
            isPending ||
            (step === 1 && !canProceedStep1) ||
            (step === 2 && !canProceedStep2)
          }
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step === 3 ? "Find Providers" : "Continue"}
              </Text>
              <Ionicons name={step === 3 ? "flash" : "arrow-forward"} size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: Colors.background,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  progressBar: { flexDirection: "row", gap: 4, paddingHorizontal: 16, marginBottom: 20 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  progressSegmentActive: { backgroundColor: Colors.primary },
  stepContent: { paddingHorizontal: 20 },
  stepTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, marginBottom: 6 },
  stepSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  catCard: {
    width: "46%",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 10,
    flexGrow: 1,
  },
  catCardSelected: { borderColor: Colors.primary },
  catIcon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  catLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  catLabelSelected: { color: Colors.primary },
  catCheck: { position: "absolute", top: 10, right: 10 },
  field: { marginBottom: 20 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  textArea: { height: 120, paddingTop: 14 },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textTertiary, textAlign: "right", marginTop: 4 },
  urgencyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  urgencyCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
  },
  urgencyLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  urgencyDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  addressList: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addressRowSelected: { backgroundColor: Colors.primary + "08" },
  addressText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  nextBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 14,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
