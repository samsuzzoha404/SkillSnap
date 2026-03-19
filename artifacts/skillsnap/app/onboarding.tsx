import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    icon: "flash" as const,
    title: "Find Trusted\nLocal Experts",
    subtitle: "Connect with verified, skilled professionals in Kuala Lumpur for all your home service needs.",
    color: Colors.primary,
  },
  {
    id: "2",
    icon: "sparkles" as const,
    title: "AI-Powered\nMatching",
    subtitle: "Our smart engine ranks providers by distance, rating, availability and experience — instantly.",
    color: "#1B5E8B",
  },
  {
    id: "3",
    icon: "shield-checkmark" as const,
    title: "Book & Track\nWith Confidence",
    subtitle: "Real-time job tracking, secure payments in MYR, and guaranteed satisfaction on every service.",
    color: Colors.accent,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(activeIndex + 1);
    } else {
      router.replace("/auth/login");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={() => router.replace("/auth/login")} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + "15" }]}>
              <View style={[styles.iconInner, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={42} color="#fff" />
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={[styles.bottom, { paddingBottom: botPad + 24 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? Colors.primary : Colors.border,
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>
            {activeIndex === slides.length - 1 ? "Get Started" : "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/auth/login")} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>
            Already have an account?{" "}
            <Text style={{ color: Colors.primary, fontFamily: "Inter_600SemiBold" }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  skipRow: { paddingHorizontal: 24, paddingTop: 8, alignItems: "flex-end" },
  skipBtn: { padding: 8 },
  skipText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  iconInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.text,
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
  },
  bottom: { paddingHorizontal: 24, paddingTop: 16 },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 32 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
    marginBottom: 20,
  },
  nextText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  loginLink: { alignItems: "center" },
  loginLinkText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
});
