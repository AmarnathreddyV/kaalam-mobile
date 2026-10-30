import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./src/auth/supabase";
import { AuthScreen } from "./src/screens/AuthScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PanchangamScreen } from "./src/screens/PanchangamScreen";
import { MuhurthamScreen } from "./src/screens/MuhurthamScreen";
import { HoroscopeScreen } from "./src/screens/HoroscopeScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { colors } from "./src/theme/colors";
import { AppBackground } from "./src/components/AppBackground";

type TabName = "Home" | "Panchangam" | "Muhurtham" | "Horoscope" | "Profile";
const tabs: TabName[] = ["Home", "Panchangam", "Muhurtham", "Horoscope", "Profile"];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("Home");

  useEffect(() => {
    if (!supabaseConfigured) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfileReady(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    async function checkProfile() {
      if (!session?.user) { setProfileReady(false); return; }
      setProfileLoading(true);
      const { data, error } = await supabase.from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .maybeSingle();
      if (alive) {
        setProfileReady(!error && data?.onboarding_complete === true);
        setProfileLoading(false);
      }
    }
    checkProfile();
    return () => { alive = false; };
  }, [session]);

  const signOut = async () => { await supabase.auth.signOut(); };

  if (!authReady || (session && profileLoading)) {
    return <SafeAreaProvider><AppBackground /><SafeAreaView style={styles.center}><ActivityIndicator color={colors.maroon} /></SafeAreaView></SafeAreaProvider>;
  }

  if (!supabaseConfigured) {
    return (
      <SafeAreaProvider><AppBackground /><SafeAreaView style={styles.config}>
        <Text style={styles.brand}>KAALAM</Text>
        <Text style={styles.configTitle}>Account setup required</Text>
        <Text style={styles.configBody}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your Expo app environment, then rebuild the app.</Text>
      </SafeAreaView></SafeAreaProvider>
    );
  }

  if (!session) {
    return <SafeAreaProvider><AppBackground /><SafeAreaView style={styles.safe}><StatusBar style="dark" /><AuthScreen /></SafeAreaView></SafeAreaProvider>;
  }

  if (!profileReady) {
    return <SafeAreaProvider><AppBackground /><SafeAreaView style={styles.safe}><StatusBar style="dark" /><OnboardingScreen onComplete={() => setProfileReady(true)} /></SafeAreaView></SafeAreaProvider>;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case "Panchangam": return <PanchangamScreen />;
      case "Muhurtham": return <MuhurthamScreen />;
      case "Horoscope": return <HoroscopeScreen />;
      case "Profile": return <ProfileScreen />;
      default: return <HomeScreen onOpenMuhurtham={() => setActiveTab("Muhurtham")} />;
    }
  };

  return (
    <SafeAreaProvider>
      <AppBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.wordmark}>KAALAM</Text>
          <Text onPress={signOut} style={styles.signOut}>SIGN OUT</Text>
        </View>
        <View style={styles.content}>{renderScreen()}</View>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const selected = activeTab === tab;
            return (
              <Text key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, selected && styles.tabActive]}>{tab}</Text>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  config: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 28 },
  brand: { color: colors.maroonDark, fontSize: 23, fontWeight: "700", letterSpacing: 5, fontFamily: "Georgia", marginBottom: 30 },
  configTitle: { color: colors.maroonDark, fontSize: 23, fontWeight: "600" },
  configBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  header: { height: 62, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: "rgba(255, 241, 214, 0.76)" },
  wordmark: { color: colors.maroonDark, fontSize: 23, letterSpacing: 4, fontWeight: "700", fontFamily: "Georgia" },
  signOut: { color: colors.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: "700", padding: 10 },
  content: { flex: 1 },
  tabBar: { height: 66, flexDirection: "row", backgroundColor: "rgba(255, 244, 221, 0.96)", borderTopWidth: 1, borderTopColor: colors.line, alignItems: "center", justifyContent: "space-around", paddingHorizontal: 4 },
  tab: { color: colors.muted, fontSize: 10, paddingVertical: 12 },
  tabActive: { color: colors.maroon, fontWeight: "700" },
});
