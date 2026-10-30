import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PanchangamScreen } from "./src/screens/PanchangamScreen";
import { MuhurthamScreen } from "./src/screens/MuhurthamScreen";
import { HoroscopeScreen } from "./src/screens/HoroscopeScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { colors } from "./src/theme/colors";

type TabName = "Home" | "Panchangam" | "Muhurtham" | "Horoscope" | "Profile";

const tabs: TabName[] = ["Home", "Panchangam", "Muhurtham", "Horoscope", "Profile"];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>("Home");

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
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.wordmark}>KAALAM</Text>
          <TouchableOpacity style={styles.datePill} onPress={() => setActiveTab("Panchangam")}>
            <Text style={styles.datePillText}>TODAY</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>{renderScreen()}</View>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const selected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setActiveTab(tab)}
                style={styles.tab}
              >
                <View style={[styles.tabMark, selected && styles.tabMarkActive]} />
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 62, paddingHorizontal: 24, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  wordmark: { color: colors.maroon, fontSize: 21, letterSpacing: 4, fontWeight: "700" },
  datePill: { borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 },
  datePillText: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  content: { flex: 1 },
  tabBar: {
    height: 70, flexDirection: "row", backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 5,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  tabMark: { width: 18, height: 3, borderRadius: 2, backgroundColor: "transparent" },
  tabMarkActive: { backgroundColor: colors.gold },
  tabText: { fontSize: 10, color: colors.muted },
  tabTextActive: { color: colors.maroon, fontWeight: "700" },
});
