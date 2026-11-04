import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./src/auth/supabase";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PanchangamScreen } from "./src/screens/PanchangamScreen";
import { PoojaItemsScreen } from "./src/screens/PoojaItemsScreen";
import { HoroscopeScreen } from "./src/screens/HoroscopeScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { DevotionalSongsScreen } from "./src/screens/DevotionalSongsScreen";
import { colors } from "./src/theme/colors";
import { AppBackground } from "./src/components/AppBackground";
import { DailyDeityWelcome } from "./src/components/DailyDeityWelcome";
import { LanguageProvider, useLanguage, AppLanguage } from "./src/i18n";

type TabName = "Home" | "Panchangam" | "Pooja Items" | "Horoscope" | "Profile" | "Devotional Songs";
const tabs: TabName[] = ["Home", "Panchangam", "Pooja Items", "Horoscope", "Profile", "Devotional Songs"];

function AppContent() {
  const { t, setLanguage } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("Home");
  const [showDailyWelcome, setShowDailyWelcome] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) { setAuthReady(true); return; }

    let mounted = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession) setProfileReady(false);
    });

    (async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;
      if (sessionError) {
        setAuthError(sessionError.message);
        setAuthReady(true);
        return;
      }

      if (data.session) {
        setSession(data.session);
        setAuthReady(true);
        return;
      }

      // Create a private anonymous session in the background. No login,
      // phone number, email, or OTP is shown or requested from the user.
      const { data: anonymousData, error: anonymousError } =
        await supabase.auth.signInAnonymously();

      if (!mounted) return;
      if (anonymousError || !anonymousData.session) {
        setAuthError(
          anonymousError?.message ||
          "Could not start a guest session. Enable Anonymous Sign-Ins in Supabase Authentication settings."
        );
      } else {
        setSession(anonymousData.session);
      }
      setAuthReady(true);
    })();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function checkProfile() {
      if (!session?.user) { setProfileReady(false); return; }
      setProfileLoading(true);
      const { data, error } = await supabase.from("profiles")
        .select("onboarding_complete,preferred_language")
        .eq("id", session.user.id)
        .maybeSingle();
      if (alive) {
        const savedLanguage = data?.preferred_language;
        if (savedLanguage === "Telugu" || savedLanguage === "Hindi" || savedLanguage === "English") {
          setLanguage(savedLanguage as AppLanguage);
        }
        setProfileReady(!error && data?.onboarding_complete === true);
        setProfileLoading(false);
      }
    }
    checkProfile();
    return () => { alive = false; };
  }, [session]);


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
    return (
      <SafeAreaProvider><AppBackground /><SafeAreaView style={styles.config}>
        <Text style={styles.brand}>KAALAM</Text>
        <Text style={styles.configTitle}>Guest access setup needed</Text>
        <Text style={styles.configBody}>
          {authError || "Enable Anonymous Sign-Ins in Supabase Authentication settings, then restart KAALAM."}
        </Text>
      </SafeAreaView></SafeAreaProvider>
    );
  }

  if (!profileReady) {
    return <SafeAreaProvider><AppBackground /><SafeAreaView style={styles.safe}><StatusBar style="dark" /><OnboardingScreen onComplete={() => setProfileReady(true)} /></SafeAreaView></SafeAreaProvider>;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case "Panchangam": return <PanchangamScreen />;
      case "Pooja Items": return <PoojaItemsScreen />;
      case "Horoscope": return <HoroscopeScreen />;
      case "Profile": return <ProfileScreen />;
      case "Devotional Songs": return <DevotionalSongsScreen />;
      default: return <HomeScreen onOpenPoojaItems={() => setActiveTab("Pooja Items")} />;
    }
  };

  return (
    <SafeAreaProvider>
      <AppBackground />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Image source={require("./assets/kaalam-logo.png")} style={styles.headerLogo} resizeMode="contain" accessibilityLabel="KAALAM logo" />
          
        </View>
        <View style={styles.content}>{renderScreen()}</View>
        <DailyDeityWelcome visible={showDailyWelcome} onContinue={() => setShowDailyWelcome(false)} />
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const selected = activeTab === tab;
            const icon = tab === "Home" ? "⌂" : tab === "Panchangam" ? "▦" : tab === "Pooja Items" ? "✿" : tab === "Horoscope" ? "✧" : tab === "Profile" ? "◉" : "♫";
            return (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} activeOpacity={0.75}
                accessibilityRole="button" accessibilityLabel={t(tab)} accessibilityState={{ selected }}
                style={[styles.tabButton, selected && styles.tabButtonActive]}>
                <Text style={[styles.tabIcon, selected && styles.tabIconActive]}>{icon}</Text>
                <Text numberOfLines={1} style={[styles.tab, selected && styles.tabActive]}>{t(tab)}</Text>
              </TouchableOpacity>
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
  header: { height: 62, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "transparent", borderBottomWidth: 0 },
  headerLogo: { width: 112, height: 58 },
  content: { flex: 1 },
  tabBar: { height: 72, flexDirection: "row", backgroundColor: "rgba(255, 244, 221, 0.98)", borderTopWidth: 1, borderTopColor: colors.line, alignItems: "center", justifyContent: "space-around", paddingHorizontal: 4 },
  tabButton: { flex: 1, height: 60, alignItems: "center", justifyContent: "center", borderRadius: 12, marginHorizontal: 2 },
  tabButtonActive: { backgroundColor: "rgba(113, 55, 15, 0.08)" },
  tabIcon: { color: colors.muted, fontSize: 22, lineHeight: 26 },
  tabIconActive: { color: colors.maroon, fontWeight: "700" },
  tab: { color: colors.muted, fontSize: 8, paddingTop: 2, paddingBottom: 3 },
  tabActive: { color: colors.maroon, fontWeight: "700" },
});

export default function App() {
  return <LanguageProvider><AppContent /></LanguageProvider>;
}
