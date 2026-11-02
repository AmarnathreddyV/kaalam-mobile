import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Screen, SectionTitle, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { fetchDailyPanchangam, DailyPanchangamResponse } from "../services/panchangam";
import { supabase } from "../auth/supabase";

type Profile = {
  full_name?: string | null;
  date_of_birth?: string | null;
  time_of_birth?: string | null;
  birth_place?: string | null;
  current_location?: string | null;
  rashi?: string | null;
  nakshatra?: string | null;
  pada?: number | null;
  preferred_language?: string | null;
};

function todayLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(new Date()).toUpperCase().replace(",", " ·");
}

export function HomeScreen({ onOpenMuhurtham }: { onOpenMuhurtham: () => void }) {
  const [result, setResult] = useState<DailyPanchangamResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: auth }, { data: profileData, error: pError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles")
          .select("full_name,date_of_birth,time_of_birth,birth_place,current_location,preferred_language")
          .maybeSingle(),
      ]);
      if (pError) setProfileError(pError.message);
      else setProfile(profileData as Profile | null);

      const userName = auth.user?.user_metadata?.full_name;
      if (!profileData && typeof userName === "string") {
        setProfile({ full_name: userName });
      }
      setResult(await fetchDailyPanchangam());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load today's Panchangam.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const p = result?.data?.panchang;
  const tithi = [p?.tithi?.name, p?.tithi?.paksha].filter(Boolean).join(" · ") || "—";
  const nakshatra = p?.nakshatra?.name || "—";
  const yoga = p?.yoga?.name || "—";
  const karana = p?.karana?.name || "—";
  const name = profile?.full_name?.trim() || "there";
  const daily = result?.data;
  const timeText = (value?: string) => {
    if (!value) return "Unavailable";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unavailable";
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
    }).format(parsed);
  };
  const timeRange = (period?: { start?: string; end?: string }) =>
    period?.start && period?.end ? `${timeText(period.start)} – ${timeText(period.end)}` : "Unavailable";
  const sunrise = daily?.sun_times?.rise?.local_datetime;
  const sunset = daily?.sun_times?.set?.local_datetime;
  const choghadiyaGood = (daily?.choghadiya?.day || []).filter(x =>
    ["Amrit", "Shubh", "Labh", "Char"].includes(x.name || "")
  );
  const basicDetails = useMemo(() => [
    ["Rashi", profile?.rashi || "Birth-chart calculation pending"],
    ["Janma Nakshatra", profile?.nakshatra || "Birth-chart calculation pending"],
    ["Birth date", profile?.date_of_birth || "Not provided"],
    ["Birth place", profile?.birth_place || "Not provided"],
  ], [profile]);

  return (
    <Screen>
      <Text style={styles.date}>{todayLabel()}</Text>
      <Text style={styles.greeting}>Namaskaram, {name}</Text>
      <Text style={styles.name}>Your day, in alignment.</Text>

      <SectionTitle>YOUR ASTROLOGY PROFILE</SectionTitle>
      <Panel>
        {basicDetails.map(([label, value], index) => (
          <LabelValue key={label} label={label} value={value} last={index === basicDetails.length - 1} />
        ))}
        {!!profileError && <Text style={styles.smallNote}>Profile details could not be loaded: {profileError}</Text>}
        <Text style={styles.smallNote}>Rashi and Janma Nakshatra will appear after a verified birth-chart calculation is connected. We do not infer them from the current day's Nakshatra.</Text>
      </Panel>

      <SectionTitle>THIS DAY'S PANCHANGAM</SectionTitle>
      <Panel>
        {loading ? (
          <View style={styles.state}><ActivityIndicator color={colors.maroon} /><Text style={styles.stateText}>Loading today's Panchangam…</Text></View>
        ) : error ? (
          <View>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={load}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.panchangamGrid}>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>TITHI</Text><Text style={styles.gridValue}>{tithi}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>NAKSHATRA</Text><Text style={styles.gridValue}>{nakshatra}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>YOGA</Text><Text style={styles.gridValue}>{yoga}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>KARANA</Text><Text style={styles.gridValue}>{karana}</Text></View>
            </View>
            <Text style={styles.smallNote}>Local Panchangam snapshot · {result?.date || ""}</Text>
          </>
        )}
      </Panel>

      <SectionTitle>DAILY TIMINGS · HYDERABAD</SectionTitle>
      <Panel>
        <LabelValue label="Sunrise" value={timeText(sunrise)} />
        <LabelValue label="Sunset" value={timeText(sunset)} />
        <LabelValue label="Rahu Kalam" value={timeRange(daily?.inauspicious_periods?.rahu_kaal)} />
        <LabelValue label="Yamagandam" value={timeRange(daily?.inauspicious_periods?.yamaganda)} />
        <LabelValue label="Gulika Kalam" value={timeRange(daily?.inauspicious_periods?.gulika_kaal)} />
        <LabelValue
          label="Abhijit Muhurat"
          value={timeRange(daily?.abhijit_muhurat?.interval?.period?.[0])}
          last={!choghadiyaGood.length}
        />
        {!!choghadiyaGood.length && (
          <View style={styles.timingList}>
            <Text style={styles.gridLabel}>FAVOURABLE CHOGHADIYA WINDOWS</Text>
            {choghadiyaGood.map((slot, index) => (
              <LabelValue key={`${slot.name}-${index}`} label={slot.name || "Choghadiya"} value={timeRange(slot)} last={index === choghadiyaGood.length - 1} />
            ))}
          </View>
        )}
        <Text style={styles.smallNote}>
          Timings are provider calculations for Hyderabad in IST. Choghadiya and Abhijit are general daily indicators, not a substitute for event-specific Muhurtham.
        </Text>
        {!!result?.unavailable && Object.keys(result.unavailable).length > 0 && (
          <Text style={styles.smallNote}>Some timing categories could not be loaded: {Object.keys(result.unavailable).join(", ")}.</Text>
        )}
      </Panel>

      <SectionTitle>YOUR DAILY SUGGESTION</SectionTitle>
      <Panel>
        <Text style={styles.suggestionTitle}>Personal guidance</Text>
        <Text style={styles.horoscope}>Rashi-based suggestions such as a temple visit, a preferred colour or a simple daily observance will appear after your birth Rashi is calculated from your birth details. No generic suggestion is presented as personalized astrology.</Text>
      </Panel>

      <TouchableOpacity style={styles.cta} onPress={onOpenMuhurtham}>
        <Text style={styles.ctaEyebrow}>PLAN AN IMPORTANT EVENT</Text>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaTitle}>Check a date for an event</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
        <Text style={styles.ctaDescription}>Marriage, Gruhapravesam, registration, joining, meetings and more.</Text>
      </TouchableOpacity>
      <Text style={styles.note}>Panchangam data is provided by Navamsha. Daily timing and event-specific Muhurtham recommendations are being connected and validated.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.gold, fontSize: 10, letterSpacing: 1.7, fontWeight: "700", marginTop: 8 },
  greeting: { color: colors.maroonDark, fontSize: 29, fontWeight: "600", marginTop: 13 },
  name: { color: colors.muted, fontSize: 13, marginTop: 5 },
  panchangamGrid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%", paddingVertical: 12 },
  gridLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.3, marginBottom: 7 },
  gridValue: { color: colors.text, fontSize: 15, fontWeight: "600" },
  state: { alignItems: "center", paddingVertical: 18, gap: 9 },
  timingList: { marginTop: 14 },
  stateText: { color: colors.muted, fontSize: 12 },
  error: { color: colors.maroon, fontSize: 12, lineHeight: 18 },
  retry: { color: colors.gold, fontSize: 12, fontWeight: "700", marginTop: 10 },
  horoscope: { color: colors.text, fontSize: 13, lineHeight: 21 },
  suggestionTitle: { color: colors.maroonDark, fontFamily: "Georgia", fontSize: 17, fontWeight: "600", marginBottom: 8 },
  smallNote: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 10 },
  cta: { backgroundColor: "#71370F", borderRadius: 15, padding: 19, marginTop: 25 },
  ctaEyebrow: { color: "#D9C3A2", fontSize: 9, letterSpacing: 1.5, fontWeight: "700" },
  ctaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  ctaTitle: { color: "#FFFDFA", fontSize: 17, fontWeight: "600" },
  ctaDescription: { color: "#E7D4B6", fontSize: 11, lineHeight: 16, marginTop: 8 },
  arrow: { color: "#E7D4B6", fontSize: 24 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 15 },
});
