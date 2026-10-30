import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Screen, SectionTitle, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";

export function HomeScreen({ onOpenMuhurtham }: { onOpenMuhurtham: () => void }) {
  return (
    <Screen>
      <Text style={styles.date}>FRIDAY  ·  30 OCTOBER 2026</Text>
      <Text style={styles.greeting}>Good morning</Text>
      <Text style={styles.name}>Your day, in alignment.</Text>

      <SectionTitle>Today's Panchangam <Text style={styles.sample}>SAMPLE DATA</Text></SectionTitle>
      <Panel>
        <View style={styles.panchangamGrid}>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>TITHI</Text><Text style={styles.gridValue}>Ekadashi</Text></View>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>NAKSHATRA</Text><Text style={styles.gridValue}>Rohini</Text></View>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>YOGA</Text><Text style={styles.gridValue}>Siddha</Text></View>
          <View style={styles.gridItem}><Text style={styles.gridLabel}>KARANA</Text><Text style={styles.gridValue}>Bava</Text></View>
        </View>
      </Panel>

      <SectionTitle>Important timings</SectionTitle>
      <Panel>
        <LabelValue label="Subha Gadiyalu" value="To be calculated" />
        <LabelValue label="Rahu Kalam" value="To be calculated" />
        <LabelValue label="Yamagandam" value="To be calculated" />
        <LabelValue label="Durmuhurtham" value="To be calculated" last />
      </Panel>

      <SectionTitle>Today's horoscope</SectionTitle>
      <Panel>
        <Text style={styles.horoscope}>Your personalized horoscope will appear here after your birth details and astrology calculation service are connected.</Text>
      </Panel>

      <TouchableOpacity style={styles.cta} onPress={onOpenMuhurtham}>
        <Text style={styles.ctaEyebrow}>PLAN AN IMPORTANT EVENT</Text>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaTitle}>Find an auspicious date</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.note}>Panchangam values shown here are placeholders, not verified timings.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.gold, fontSize: 10, letterSpacing: 1.7, fontWeight: "700", marginTop: 8 },
  greeting: { color: colors.maroonDark, fontSize: 31, fontWeight: "600", marginTop: 13 },
  name: { color: colors.muted, fontSize: 13, marginTop: 5 },
  sample: { color: colors.gold, fontSize: 8, letterSpacing: 1, fontWeight: "700" },
  panchangamGrid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%", paddingVertical: 12 },
  gridLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.3, marginBottom: 7 },
  gridValue: { color: colors.text, fontSize: 15, fontWeight: "600" },
  horoscope: { color: colors.text, fontSize: 13, lineHeight: 21 },
  cta: { backgroundColor: colors.maroon, borderRadius: 15, padding: 19, marginTop: 25 },
  ctaEyebrow: { color: "#D9C3A2", fontSize: 9, letterSpacing: 1.5, fontWeight: "700" },
  ctaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  ctaTitle: { color: "#FFFDFA", fontSize: 17, fontWeight: "600" },
  arrow: { color: "#E7D4B6", fontSize: 24 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 15 },
});
