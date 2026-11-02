import React, { useCallback, useEffect, useState } from "react";
import { Text, StyleSheet, ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Screen, PageHeading, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { fetchDailyPanchangam, DailyPanchangamResponse } from "../services/panchangam";

export function PanchangamScreen() {
  const [result, setResult] = useState<DailyPanchangamResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await fetchDailyPanchangam());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Panchangam.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const p = result?.data?.panchang;\n  const d = result?.data;\n  const formatTime = (value?: string) => {\n    if (!value) return "Unavailable";\n    const parsed = new Date(value);\n    if (Number.isNaN(parsed.getTime())) return "Unavailable";\n    return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(parsed);\n  };\n  const range = (period?: { start?: string; end?: string }) => period?.start && period?.end ? formatTime(period.start) + " – " + formatTime(period.end) : "Unavailable";
  return (
    <Screen>
      <PageHeading title="Panchangam" subtitle={result ? `${result.date} · Hyderabad · Telugu Drik` : "Daily calendar"} />
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
      <Text style={styles.heading}>Sun timings</Text>
      <Panel>
        <LabelValue label="Sunrise" value={formatTime(d?.sun_times?.rise?.local_datetime)} />
        <LabelValue label="Sunset" value={formatTime(d?.sun_times?.set?.local_datetime)} last />
      </Panel>
      <Text style={styles.heading}>Avoidable periods</Text>
      <Panel>
        <LabelValue label="Rahu Kalam" value={range(d?.inauspicious_periods?.rahu_kaal)} />
        <LabelValue label="Yamagandam" value={range(d?.inauspicious_periods?.yamaganda)} />
        <LabelValue label="Gulika Kalam" value={range(d?.inauspicious_periods?.gulika_kaal)} last />
      </Panel>
      <Text style={styles.heading}>Other daily windows</Text>
      <Panel>
        <LabelValue label="Abhijit Muhurat" value={range(d?.abhijit_muhurat?.interval?.period?.[0])} last />
        <Text style={styles.footnote}>Choghadiya day slots</Text>
        {(d?.choghadiya?.day || []).map((slot, index) => (
          <LabelValue key={String(slot.name) + index} label={slot.name || "Choghadiya"} value={range(slot)} last={index === (d?.choghadiya?.day?.length || 0) - 1} />
        ))}
      </Panel>
      <Text style={styles.footnote}>Times are displayed in Hyderabad local time (IST). Abhijit and Choghadiya are general daily indicators, not event-specific Muhurtham approval. Missing categories are shown as unavailable.</Text>
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
