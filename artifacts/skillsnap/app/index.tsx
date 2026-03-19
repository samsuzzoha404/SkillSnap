import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.primary }}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}
