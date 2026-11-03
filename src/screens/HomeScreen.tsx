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
  preferred_language?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  current_timezone?: string | null;
  birth_chart_summary?: { rashi?: string; nakshatra?: string; pada?: number; lagna?: string } | null;
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
          .select("full_name,date_of_birth,time_of_birth,birth_place,current_location,preferred_language,current_latitude,current_longitude,current_timezone,birth_chart_summary")
          .maybeSingle(),
      ]);
      if (pError) setProfileError(pError.message);
      else setProfile(profileData as Profile | null);

      const userName = auth.user?.user_metadata?.full_name;
      if (!profileData && typeof userName === "string") {
        setProfile({ full_name: userName });
      }
      if (profileData?.current_latitude == null || profileData?.current_longitude == null || !profileData?.current_timezone) {
        throw new Error("Your current location has not been resolved yet. Please update your profile details.");
      }
      setResult(await fetchDailyPanchangam(new Date(), {
        latitude: profileData.current_latitude,
        longitude: profileData.current_longitude,
        timezone: profileData.current_timezone,
      }));
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
  const userTimezone = profile?.current_timezone || "UTC";
  const timeText = (value?: string) => {
    if (!value) return "Unavailable";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unavailable";
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: userTimezone,
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
    ["Rashi", profile?.birth_chart_summary?.rashi || "Not calculated"],
    ["Janma Nakshatra", profile?.birth_chart_summary?.nakshatra || "Not calculated"],
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
        <Text style={styles.smallNote}>Birth-chart details are shown from the calculation saved to your profile. If your birth details change, update them and recalculate your chart.</Text>
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

      <SectionTitle>DAILY TIMINGS · {profile?.current_location?.toUpperCase() || "YOUR LOCATION"}</SectionTitle>
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
          Timings are provider calculations for your saved current location and its local time zone. Choghadiya and Abhijit are general daily indicators, not a substitute for event-specific Muhurtham.
        </Text>
        {!!result?.unavailable && Object.keys(result.unavailable).length > 0 && (
          <Text style={styles.smallNote}>Some timing categories could not be loaded: {Object.keys(result.unavailable).join(", ")}.</Text>
        )}
      </Panel>

      <SectionTitle>DAILY GUIDANCE · TELUGU DRIK</SectionTitle>
      <Panel>
        <Text style={styles.suggestionTitle}>Today's timing guidance</Text>
        {loading ? (
          <Text style={styles.horoscope}>Preparing guidance from today's Panchangam…</Text>
        ) : error ? (
          <Text style={styles.horoscope}>Daily guidance is unavailable until Panchangam data loads successfully.</Text>
        ) : (
          <>
            {choghadiyaGood.length > 0 ? (
              <>
                <Text style={styles.guidanceLabel}>GENERAL FAVOURABLE INDICATORS</Text>
                <Text style={styles.horoscope}>The following daytime Choghadiya periods are traditionally classed as Amrit, Shubh, Labh or Char:</Text>
                {choghadiyaGood.map((slot, index) => (
                  <LabelValue key={`guidance-good-${slot.name}-${index}`} label={slot.name || "Choghadiya"} value={timeRange(slot)} last={index === choghadiyaGood.length - 1} />
                ))}
                <Text style={styles.smallNote}>These are general Panchangam indicators for routine planning, not confirmation that a specific ceremony or major decision is auspicious.</Text>
              </>
            ) : (
              <Text style={styles.horoscope}>No favourable daytime Choghadiya windows were returned by the provider for today. KAALAM will not invent a time window.</Text>
            )}
            <View style={styles.guidanceDivider} />
            <Text style={styles.guidanceLabel}>PERIODS TO BE MINDFUL OF</Text>
            {[
              ["Rahu Kalam", daily?.inauspicious_periods?.rahu_kaal],
              ["Yamagandam", daily?.inauspicious_periods?.yamaganda],
              ["Gulika Kalam", daily?.inauspicious_periods?.gulika_kaal],
            ].filter(([, period]) => !!period?.start && !!period?.end).map(([label, period], index, rows) => (
              <LabelValue key={String(label)} label={String(label)} value={timeRange(period as DailyTimePeriod)} last={index === rows.length - 1} />
            ))}
            {!daily?.inauspicious_periods?.rahu_kaal?.start && !daily?.inauspicious_periods?.yamaganda?.start && !daily?.inauspicious_periods?.gulika_kaal?.start && (
              <Text style={styles.horoscope}>The provider did not return the inauspicious-period timings. Check again later.</Text>
            )}
            <Text style={styles.smallNote}>Rule-based guidance using the returned Telugu Drik Panchangam timing data. It is not personalized horoscope advice or an event-specific Muhurtham approval.</Text>
          </>
        )}
      </Panel>

      <TouchableOpacity style={styles.cta} onPress={onOpenMuhurtham}>
        <Text style={styles.ctaEyebrow}>PLAN AN IMPORTANT EVENT</Text>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaTitle}>Check a date for an event</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
        <Text style={styles.ctaDescription}>Marriage, Gruhapravesam, registration, joining, meetings and more.</Text>
      </TouchableOpacity>
      <Text style={styles.note}>Panchangam data is provided by Navamsha using your saved location. General daily indicators are not a guarantee of personal outcomes and do not replace event-specific Telugu Drik Muhurtham analysis.</Text>
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
  suggestionTitle: { color: colors.maroonDark, fontFamily: "Georgia", fontSize: 17, fontWeight: "600", marginBottom: 12 },
  guidanceLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.2, fontWeight: "700", marginTop: 8, marginBottom: 5 },
  guidanceDivider: { height: 1, backgroundColor: colors.line, marginVertical: 13 },
  smallNote: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 10 },
  cta: { backgroundColor: "#71370F", borderRadius: 15, padding: 19, marginTop: 25 },
  ctaEyebrow: { color: "#D9C3A2", fontSize: 9, letterSpacing: 1.5, fontWeight: "700" },
  ctaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  ctaTitle: { color: "#FFFDFA", fontSize: 17, fontWeight: "600" },
  ctaDescription: { color: "#E7D4B6", fontSize: 11, lineHeight: 16, marginTop: 8 },
  arrow: { color: "#E7D4B6", fontSize: 24 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 15 },
});
