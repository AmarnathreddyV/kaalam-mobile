import React, { useCallback, useEffect, useState } from "react";
import { Text, StyleSheet, ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Screen, PageHeading, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { fetchDailyPanchangam, DailyPanchangamResponse } from "../services/panchangam";
import { supabase } from "../auth/supabase";
import { useLanguage } from "../i18n";

type LocationProfile = { current_location?: string; current_latitude?: number; current_longitude?: number; current_timezone?: string };

export function PanchangamScreen() {
  const { t } = useLanguage();
  const [result, setResult] = useState<DailyPanchangamResponse | null>(null);
  const [place, setPlace] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("current_location,current_latitude,current_longitude,current_timezone")
        .maybeSingle();
      if (profileError) throw profileError;
      const location = profile as LocationProfile | null;
      if (location?.current_latitude == null || location?.current_longitude == null || !location?.current_timezone) {
        throw new Error("Your current location has not been resolved. Complete or update your profile first.");
      }
      setPlace(location.current_location || "Saved location");
      setTimezone(location.current_timezone);
      setResult(await fetchDailyPanchangam(new Date(), {
        latitude: location.current_latitude,
        longitude: location.current_longitude,
        timezone: location.current_timezone,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Panchangam.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const p = result?.data?.panchang;
  const d = result?.data;
  const formatTime = (value?: string) => {
    if (!value) return "Unavailable";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unavailable";
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone,
    }).format(parsed);
  };
  const range = (period?: { start?: string; end?: string }) =>
    period?.start && period?.end ? formatTime(period.start) + " – " + formatTime(period.end) : "Unavailable";

  return (
    <Screen>
      <PageHeading title="Panchangam" subtitle={result ? `${result.date} · ${place} · Telugu Drik` : "Daily calendar"} />
      {loading ? (
        <Panel><ActivityIndicator color={colors.maroon} /><Text style={styles.status}>Loading Panchangam…</Text></Panel>
      ) : error ? (
        <Panel><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>{t("Try again")}</Text></TouchableOpacity></Panel>
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
        <LabelValue label={t("Sunrise")} value={formatTime(d?.sun_times?.rise?.local_datetime)} />
        <LabelValue label={t("Sunset")} value={formatTime(d?.sun_times?.set?.local_datetime)} last />
      </Panel>
      <Text style={styles.heading}>Avoidable periods</Text>
      <Panel>
        <LabelValue label={t("Rahu Kalam")} value={range(d?.inauspicious_periods?.rahu_kaal)} />
        <LabelValue label={t("Yamagandam")} value={range(d?.inauspicious_periods?.yamaganda)} />
        <LabelValue label={t("Gulika Kalam")} value={range(d?.inauspicious_periods?.gulika_kaal)} last />
      </Panel>
      <Text style={styles.heading}>Other daily windows</Text>
      <Panel>
        <LabelValue label="Abhijit Muhurat" value={range(d?.abhijit_muhurat?.interval?.period?.[0])} last />
        <Text style={styles.footnote}>Choghadiya day slots</Text>
        {(d?.choghadiya?.day || []).map((slot, index) => (
          <LabelValue key={String(slot.name) + index} label={slot.name || "Choghadiya"} value={range(slot)} last={index === (d?.choghadiya?.day?.length || 0) - 1} />
        ))}
      </Panel>
      <Text style={styles.footnote}>Times are displayed in the local time zone of your saved current location. Abhijit and Choghadiya are general daily indicators, not event-specific Muhurtham approval. Missing categories are shown as unavailable.</Text>
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
