import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const P_DARK = "#0A3D27";
const P_COLOR = "#0D5C3A";
const P_ACCENT = "#10B981";
const P_INACTIVE = "rgba(255,255,255,0.45)";

export { P_COLOR, P_ACCENT, P_DARK };

export default function ProviderTabLayout() {
  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#A7F3D0",
        tabBarInactiveTintColor: P_INACTIVE,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: P_COLOR,
          borderTopWidth: 1,
          borderTopColor: P_DARK,
          elevation: 0,
          shadowOpacity: 0,
          ...(isAndroid ? { minHeight: 72 + insets.bottom, paddingBottom: insets.bottom } : {}),
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          ...(isAndroid ? { lineHeight: 14 } : {}),
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: P_COLOR }} />
        ),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Feather name="grid" size={isAndroid ? 20 : 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => <Feather name="inbox" size={isAndroid ? 20 : 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color }) => <Feather name="briefcase" size={isAndroid ? 20 : 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color }) => <Feather name="trending-up" size={isAndroid ? 20 : 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" size={isAndroid ? 20 : 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
