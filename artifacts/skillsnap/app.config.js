const expoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;
const devPort = process.env.PORT || "22172";
// For local dev, prefer the same host Metro binds to (LAN IP when using Expo Go on device).
const devHost = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || "localhost";
const origin = expoDomain ? `https://${expoDomain}` : `http://${devHost}:${devPort}`;

/** Baked into the manifest so native clients can reach the API without relying on hostUri/debuggerHost shape. */
const apiDevHost = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || undefined;

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
    android: {
      package: "com.heisenberg404.skillsnap",
    },
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
    extra: {
      apiDevHost,
      eas: {
        projectId: "8c4d7601-80ad-4e3b-9b59-eed82331d3d2",
      },
    },
  },
};
