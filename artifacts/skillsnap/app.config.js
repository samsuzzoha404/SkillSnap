const expoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;
const devPort = process.env.PORT || "22172";
// For local dev, prefer the same host Metro binds to (LAN IP when using Expo Go on device).
const devHost = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || "localhost";
const origin = expoDomain ? `https://${expoDomain}` : `http://${devHost}:${devPort}`;

module.exports = {
  expo: {
    name: "SkillSnap",
    slug: "skillsnap",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "skillsnap",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: false,
    },
    android: {},
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        {
          origin,
        },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
