import React, { useCallback, useEffect, useState } from "react";
import { Text, StyleSheet, ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Screen, PageHeading, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { fetchPanchangam, PanchangamResponse } from "../services/panchangam";

export function PanchangamScreen() {
  const [result, setResult] = useState<PanchangamResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await fetchPanchangam());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Panchangam.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const p = result?.data;
  return (
    <Screen>
      <PageHeading title="Panchangam" subtitle={result ? `${result.date} · Hyderabad` : "Daily calendar"} />
      {loading ? (
        <Panel><ActivityIndicator color={colors.maroon} /><Text style={styles.status}>Loading Panchangam…</Text></Panel>
      ) : error ? (
        <Panel>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </Panel>
      ) : (
        <>
          <Panel>
            <LabelValue label="Tithi" value={[p?.tithi?.name, p?.tithi?.paksha].filter(Boolean).join(" · ") || "—"} />
            <LabelValue label="Vara" value={p?.weekday?.name || "—"} />
            <LabelValue label="Nakshatra" value={p?.nakshatra?.name || "—"} />
            <LabelValue label="Yoga" value={p?.yoga?.name || "—"} />
            <LabelValue label="Karana" value={p?.karana?.name || "—"} last />
          </Panel>
          <View style={styles.providerRow}>
            <Text style={styles.provider}>DATA: NAVAMSHA</Text>
            <TouchableOpacity onPress={load}><Text style={styles.refresh}>REFRESH</Text></TouchableOpacity>
          </View>
        </>
      )}
      <Text style={styles.heading}>Daily timings</Text>
      <Panel>
        <LabelValue label="Sunrise / Sunset" value="Timing endpoint integration pending" />
        <LabelValue label="Rahu Kalam" value="Timing endpoint integration pending" />
        <LabelValue label="Yamagandam" value="Timing endpoint integration pending" />
        <LabelValue label="Gulika Kalam" value="Timing endpoint integration pending" />
        <LabelValue label="Durmuhurtham" value="Not included in current API integration" />
        <LabelValue label="Subha Gadiyalu" value="Requires selected tradition's rules" last />
      </Panel>
      <Text style={styles.footnote}>Initial location is Hyderabad. User-selected location and the remaining timing endpoints will be added next. Verify regional Panchangam conventions before relying on ritual timings.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  status: { color: colors.muted, textAlign: "center", marginTop: 10, fontSize: 12 },
  error: { color: colors.maroon, fontSize: 12, lineHeight: 18 },
  retry: { marginTop: 12, alignSelf: "flex-start" },
  retryText: { color: colors.gold, fontSize: 12, fontWeight: "700" },
  heading: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 25, marginBottom: 13 },
  providerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  provider: { color: colors.muted, fontSize: 9, letterSpacing: 1.2, fontWeight: "700" },
  refresh: { color: colors.gold, fontSize: 9, letterSpacing: 1.2, fontWeight: "700" },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 16 },
});
