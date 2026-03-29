import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { liveListQueryOptions } from "@/lib/liveQuery";

const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_LIGHT = "#ECFDF5";

export default function ProviderSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [radius, setRadius] = useState("15");
  const [address, setAddress] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories"),
    ...liveListQueryOptions,
  });

  const { data: existingProfile } = useQuery({
    queryKey: ["provider-me"],
    queryFn: async () => {
      try {
        return await api.get("/provider/me");
      } catch (e: any) {
        const m = String(e?.message || "");
        // New providers have no profile yet — GET /provider/me returns 404.
        if (m.toLowerCase().includes("not found")) return null;
        throw e;
      }
    },
    retry: false,
    ...liveListQueryOptions,
  });

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      Alert.alert("Required", "Please enter your business name.");
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert("Required", "Please select at least one service category.");
      return;
    }

    setLoading(true);
    try {
      if (existingProfile) {
        await api.patch("/provider/me", {
          businessName: businessName.trim(),
          bio: bio.trim(),
          yearsExperience: Number(yearsExp) || 0,
          serviceRadiusKm: Number(radius) || 15,
          address: address.trim(),
        });
      } else {
        await api.post("/provider/setup", {
          businessName: businessName.trim(),
          bio: bio.trim(),
          yearsExperience: Number(yearsExp) || 0,
          serviceRadiusKm: Number(radius) || 15,
          address: address.trim(),
          categoryIds: selectedCategories,
        });
      }

      await qc.invalidateQueries({ queryKey: ["provider-me"] });
      await qc.invalidateQueries({ queryKey: ["provider-dashboard"] });

      const goNext = () => {
        // Avoid router.back() here: new providers often have no back stack (register uses replace),
        // which breaks on web/native with "GO_BACK" / blank screen errors.
        if (existingProfile) {
          router.replace("/(provider-tabs)/profile" as any);
        } else {
          router.replace("/(provider-tabs)/dashboard" as any);
        }
      };

      Alert.alert(
        existingProfile ? "Profile Updated!" : "Profile Submitted!",
        existingProfile
          ? "Your profile has been updated successfully."
          : "Your provider profile has been submitted for verification. You'll be notified when approved.",
        [{ text: "OK", onPress: goNext }]
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (existingProfile) {
      setBusinessName(existingProfile.businessName || "");
      setBio(existingProfile.bio || "");
      setYearsExp(String(existingProfile.yearsExperience || ""));
      setRadius(String(existingProfile.serviceRadiusKm || 15));
      setAddress(existingProfile.address || "");
      if (existingProfile.services) {
        setSelectedCategories(existingProfile.services.map((s: any) => s.categoryId));
      }
    }
  }, [existingProfile]);

  const isEditing = !!existingProfile;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(provider-tabs)/dashboard" as any)
          }
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.logoMark}>
          <Feather name="briefcase" size={28} color="#fff" />
        </View>

        <Text style={styles.title}>{isEditing ? "Edit Profile" : "Set Up Provider Profile"}</Text>
        <Text style={styles.subtitle}>
          {isEditing
            ? "Update your business details"
            : "Tell us about your business so we can match you with the right customers"}
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Business Name *</Text>
            <View style={styles.inputWrap}>
              <Feather name="briefcase" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Ahmad Electrical Services"
                placeholderTextColor={Colors.textTertiary}
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Professional Bio</Text>
            <View style={[styles.inputWrap, { alignItems: "flex-start", paddingTop: 12 }]}>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                placeholder="Describe your experience, specializations, and what makes you stand out..."
                placeholderTextColor={Colors.textTertiary}
                value={bio}
                onChangeText={setBio}
                multiline
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Years of Experience</Text>
              <View style={styles.inputWrap}>
                <Feather name="clock" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  placeholderTextColor={Colors.textTertiary}
                  value={yearsExp}
                  onChangeText={setYearsExp}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Service Radius (km)</Text>
              <View style={styles.inputWrap}>
                <Feather name="map" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="15"
                  placeholderTextColor={Colors.textTertiary}
                  value={radius}
                  onChangeText={setRadius}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Service Area / Address</Text>
            <View style={styles.inputWrap}>
              <Feather name="map-pin" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Ampang, Kuala Lumpur"
                placeholderTextColor={Colors.textTertiary}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Service Categories *</Text>
            <Text style={styles.labelSub}>Select all categories you provide services for</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat: any) => {
                const selected = selectedCategories.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, selected && styles.catChipActive]}
                    onPress={() => toggleCategory(cat.id)}
                    activeOpacity={0.75}
                  >
                    <Feather name="tag" size={13} color={selected ? "#fff" : Colors.textSecondary} />
                    <Text style={[styles.catChipText, selected && styles.catChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {!isEditing && (
            <View style={styles.verifyNote}>
              <Feather name="info" size={16} color="#2563EB" />
              <Text style={styles.verifyNoteText}>
                Your profile will be reviewed within 24-48 hours. Once verified, you'll start receiving booking requests.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {isEditing ? "Save Changes" : "Submit Profile"}
                </Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, justifyContent: "center", marginBottom: 20 },
  logoMark: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: P_ACCENT,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.text, marginBottom: 8 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 32 },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  labelSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: -4 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, backgroundColor: Colors.surface,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  catChipActive: { backgroundColor: P_ACCENT, borderColor: P_ACCENT },
  catChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  catChipTextActive: { color: "#fff" },
  verifyNote: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    backgroundColor: "#EFF6FF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#BFDBFE",
  },
  verifyNoteText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#1E40AF", lineHeight: 20, flex: 1 },
  submitBtn: {
    backgroundColor: P_ACCENT, paddingVertical: 17, borderRadius: 14,
    alignItems: "center", marginTop: 8, flexDirection: "row", justifyContent: "center", gap: 10,
  },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
