import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Screen, SectionTitle, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { fetchPanchangam, PanchangamResponse } from "../services/panchangam";

function todayLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(new Date()).toUpperCase().replace(",", " ·");
}

export function HomeScreen({ onOpenMuhurtham }: { onOpenMuhurtham: () => void }) {
  const [result, setResult] = useState<PanchangamResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await fetchPanchangam());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load today's Panchangam.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const p = result?.data;
  const tithi = [p?.tithi?.name, p?.tithi?.paksha].filter(Boolean).join(" · ") || "—";
  const nakshatra = p?.nakshatra?.name || "—";
  const yoga = p?.yoga?.name || "—";
  const karana = p?.karana?.name || "—";

  return (
    <Screen>
      <Text style={styles.date}>{todayLabel()}</Text>
      <Text style={styles.greeting}>Good morning</Text>
      <Text style={styles.name}>Your day, in alignment.</Text>

      <SectionTitle>Today's Panchangam</SectionTitle>
      <Panel>
        {loading ? (
          <View style={styles.state}><ActivityIndicator color={colors.maroon} /><Text style={styles.stateText}>Loading today's Panchangam…</Text></View>
        ) : error ? (
          <View>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={load}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.panchangamGrid}>
            <View style={styles.gridItem}><Text style={styles.gridLabel}>TITHI</Text><Text style={styles.gridValue}>{tithi}</Text></View>
            <View style={styles.gridItem}><Text style={styles.gridLabel}>NAKSHATRA</Text><Text style={styles.gridValue}>{nakshatra}</Text></View>
            <View style={styles.gridItem}><Text style={styles.gridLabel}>YOGA</Text><Text style={styles.gridValue}>{yoga}</Text></View>
            <View style={styles.gridItem}><Text style={styles.gridLabel}>KARANA</Text><Text style={styles.gridValue}>{karana}</Text></View>
          </View>
        )}
      </Panel>

      <SectionTitle>Important timings</SectionTitle>
      <Panel>
        <LabelValue label="Subha Gadiyalu" value="Not connected yet" />
        <LabelValue label="Rahu Kalam" value="Not connected yet" />
        <LabelValue label="Yamagandam" value="Not connected yet" />
        <LabelValue label="Durmuhurtham" value="Not connected yet" last />
      </Panel>

      <SectionTitle>Today's horoscope</SectionTitle>
      <Panel>
        <Text style={styles.horoscope}>Your personalized horoscope will appear after your birth details and horoscope calculation service are connected.</Text>
      </Panel>

      <TouchableOpacity style={styles.cta} onPress={onOpenMuhurtham}>
        <Text style={styles.ctaEyebrow}>PLAN AN IMPORTANT EVENT</Text>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaTitle}>Find an auspicious date</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.note}>Panchangam data is provided by Navamsha. Timings and Muhurtham recommendations are not yet connected.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.gold, fontSize: 10, letterSpacing: 1.7, fontWeight: "700", marginTop: 8 },
  greeting: { color: colors.maroonDark, fontSize: 31, fontWeight: "600", marginTop: 13 },
  name: { color: colors.muted, fontSize: 13, marginTop: 5 },
  panchangamGrid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%", paddingVertical: 12 },
  gridLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.3, marginBottom: 7 },
  gridValue: { color: colors.text, fontSize: 15, fontWeight: "600" },
  state: { alignItems: "center", paddingVertical: 18, gap: 9 },
  stateText: { color: colors.muted, fontSize: 12 },
  error: { color: colors.maroon, fontSize: 12, lineHeight: 18 },
  retry: { color: colors.gold, fontSize: 12, fontWeight: "700", marginTop: 10 },
  horoscope: { color: colors.text, fontSize: 13, lineHeight: 21 },
  cta: { backgroundColor: "#71370F", borderRadius: 15, padding: 19, marginTop: 25 },
  ctaEyebrow: { color: "#D9C3A2", fontSize: 9, letterSpacing: 1.5, fontWeight: "700" },
  ctaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  ctaTitle: { color: "#FFFDFA", fontSize: 17, fontWeight: "600" },
  arrow: { color: "#E7D4B6", fontSize: 24 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 15 },
});
