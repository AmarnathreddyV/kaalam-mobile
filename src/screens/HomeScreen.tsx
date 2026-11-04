import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Screen, SectionTitle, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { fetchDailyPanchangam, DailyPanchangamResponse } from "../services/panchangam";
import { supabase } from "../auth/supabase";
import { useLanguage } from "../i18n";

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

export function HomeScreen({ onOpenPoojaItems }: { onOpenPoojaItems: () => void }) {
  const { t } = useLanguage();
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
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const weekdayGuidance: Record<string, { deity: string; temple: string; practice: string }> = {
    Sunday: { deity: "Lord Surya · Sunday", temple: "If convenient, visit a Surya or Shiva temple.", practice: "Offer a simple morning prayer to the Sun and begin the day with gratitude." },
    Monday: { deity: "Lord Shiva · Monday", temple: "If convenient, visit a Shiva temple.", practice: "Offer prayers to Lord Shiva; a quiet moment of meditation is also suitable." },
    Tuesday: { deity: "Lord Hanuman · Tuesday", temple: "If convenient, visit a Hanuman temple.", practice: "Recite Hanuman Chalisa or offer a simple prayer for courage and steadiness." },
    Wednesday: { deity: "Lord Ganesha · Wednesday", temple: "If convenient, visit a Ganesha temple.", practice: "Begin an important task with a prayer to Lord Ganesha." },
    Thursday: { deity: "Lord Vishnu · Thursday", temple: "If convenient, visit a Vishnu or Venkateswara temple.", practice: "Read or listen to a short Vishnu prayer and practise generosity." },
    Friday: { deity: "Goddess Lakshmi · Friday", temple: "If convenient, visit a Lakshmi or Devi temple.", practice: "Offer a simple prayer to Goddess Lakshmi and keep your home welcoming." },
    Saturday: { deity: "Lord Venkateswara or Hanuman · Saturday", temple: "If convenient, visit a Venkateswara or Hanuman temple.", practice: "Offer a prayer for patience, humility and service to others." },
  };
  const tithiText = [p?.tithi?.name, p?.tithi?.paksha].filter(Boolean).join(" ").toLowerCase();
  const specialTithiNote = tithiText.includes("ekadashi")
    ? "Ekadashi is traditionally observed by many devotees with Vishnu worship. Fasting practices differ; follow your health needs and family tradition."
    : tithiText.includes("purnima") || tithiText.includes("pournami")
      ? "Pournami (full-moon day) is traditionally observed with prayer and devotional practices in many households."
      : tithiText.includes("amavasya")
        ? "Amavasya is traditionally associated in many families with remembrance and prayers for ancestors; customs vary."
        : "";
  const spiritualGuidance = {
    ...(weekdayGuidance[weekday] || weekdayGuidance.Monday),
    tithiNote: specialTithiNote,
  };
  const basicDetails = useMemo(() => [
    ["Rashi", profile?.birth_chart_summary?.rashi || "Not calculated"],
    ["Janma Nakshatra", profile?.birth_chart_summary?.nakshatra || "Not calculated"],
    ["Birth date", profile?.date_of_birth || "Not provided"],
    ["Birth place", profile?.birth_place || "Not provided"],
  ], [profile]);

  return (
    <Screen>
      <Text style={styles.date}>{todayLabel()}</Text>
      <Text style={styles.greeting}>{t("Namaskaram")}, {name}</Text>
      <Text style={styles.name}>{t("Your day, in alignment.")}</Text>

      <TouchableOpacity style={styles.poojaShortcut} onPress={onOpenPoojaItems}>
        <View style={styles.poojaShortcutText}>
          <Text style={styles.poojaShortcutTitle}>{t("Pooja Items & Samagri")}</Text>
          <Text style={styles.poojaShortcutSubtitle}>{t("View occasion-wise preparation lists")}</Text>
        </View>
        <Text style={styles.poojaShortcutArrow}>{t("VIEW  →")}</Text>
      </TouchableOpacity>

      <SectionTitle>{t("YOUR ASTROLOGY PROFILE")}</SectionTitle>
      <Panel>
        {basicDetails.map(([label, value], index) => (
          <LabelValue key={label} label={label} value={value} last={index === basicDetails.length - 1} />
        ))}
        {!!profileError && <Text style={styles.smallNote}>Profile details could not be loaded: {profileError}</Text>}
        <Text style={styles.smallNote}>{t("Birth-chart details are shown from the calculation saved to your profile. If your birth details change, update them and recalculate your chart.")}</Text>
      </Panel>

      <SectionTitle>{t("THIS DAY'S PANCHANGAM")}</SectionTitle>
      <Panel>
        {loading ? (
          <View style={styles.state}><ActivityIndicator color={colors.maroon} /><Text style={styles.stateText}>{t("Loading today's Panchangam…")}</Text></View>
        ) : error ? (
          <View>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={load}><Text style={styles.retry}>{t("Try again")}</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.panchangamGrid}>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>{t("TITHI")}</Text><Text style={styles.gridValue}>{tithi}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>{t("NAKSHATRA")}</Text><Text style={styles.gridValue}>{nakshatra}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>{t("YOGA")}</Text><Text style={styles.gridValue}>{yoga}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>{t("KARANA")}</Text><Text style={styles.gridValue}>{karana}</Text></View>
            </View>
            <Text style={styles.smallNote}>Local Panchangam snapshot · {result?.date || ""}</Text>
          </>
        )}
      </Panel>


      <SectionTitle>{t("FAVOURABLE TIMINGS")}</SectionTitle>
      <Panel>
        {loading ? <Text style={styles.horoscope}>{t("Loading favourable periods…")}</Text> : (
          <>
            {choghadiyaGood.map((slot,index)=>(<LabelValue key={String(slot.name)+index} label={t(slot.name || "Choghadiya")} value={timeRange(slot)} />))}
            <LabelValue label={t("Abhijit Muhurat")} value={timeRange(daily?.abhijit_muhurat?.interval?.period?.[0])} last />
            {!choghadiyaGood.length && <Text style={styles.smallNote}>{t("No favourable Choghadiya windows were returned for today.")}</Text>}
          </>
        )}
        <Text style={styles.smallNote}>{t("General daily indicators only; these do not certify a ceremony-specific Muhurtham.")}</Text>
      </Panel>

      <SectionTitle>{t("INAUSPICIOUS TIMINGS")}</SectionTitle>
      <Panel>
        <LabelValue label={t("Rahu Kalam")} value={timeRange(daily?.inauspicious_periods?.rahu_kaal)} />
        <LabelValue label={t("Yamagandam")} value={timeRange(daily?.inauspicious_periods?.yamaganda)} />
        <LabelValue label={t("Gulika Kalam")} value={timeRange(daily?.inauspicious_periods?.gulika_kaal)} last />
        <Text style={styles.smallNote}>{t("Traditional periods to be mindful of; interpretations and practices vary.")}</Text>
      </Panel>

      <SectionTitle>{t("TODAY'S SPIRITUAL GUIDANCE")}</SectionTitle>
      <Panel>
        {loading ? <View style={styles.state}><ActivityIndicator color={colors.maroon} /><Text style={styles.stateText}>Preparing today's spiritual guidance…</Text></View> : error ? <Text style={styles.horoscope}>{t("Spiritual guidance will appear when today's Panchangam is available.")}</Text> : (
          <>
            <Text style={styles.suggestionTitle}>{spiritualGuidance.deity}</Text>
            <Text style={styles.guidanceLabel}>{t("TEMPLE SUGGESTION")}</Text><Text style={styles.horoscope}>{spiritualGuidance.temple}</Text>
            <Text style={styles.guidanceLabel}>{t("PRAYER OR ACTIVITY")}</Text><Text style={styles.horoscope}>{spiritualGuidance.practice}</Text>
            {!!spiritualGuidance.tithiNote && <><Text style={styles.guidanceLabel}>{t("PANCHANGAM NOTE")}</Text><Text style={styles.horoscope}>{spiritualGuidance.tithiNote}</Text></>}
            <Text style={styles.guidanceLabel}>{t("A THOUGHT FOR TODAY")}</Text><Text style={styles.horoscope}>{t("Try to avoid harsh words and rushed decisions. Make space for patience, kindness and thoughtful action.")}</Text>
            <Text style={styles.smallNote}>General spiritual inspiration based on common weekday devotional associations and returned Tithi. Traditions vary by family and region.</Text>
          </>
        )}
      </Panel>

      <SectionTitle>SUNRISE & SUNSET · {profile?.current_location?.toUpperCase() || "YOUR LOCATION"}</SectionTitle>
      <Panel>
        <LabelValue label={t("Sunrise")} value={timeText(sunrise)} />
        <LabelValue label={t("Sunset")} value={timeText(sunset)} last />
        <Text style={styles.smallNote}>{t("Calculated for your saved location and local time zone.")}</Text>
        {!!result?.unavailable && Object.keys(result.unavailable).length > 0 && <Text style={styles.smallNote}>Some timing categories could not be loaded: {Object.keys(result.unavailable).join(", ")}.</Text>}
      </Panel>

      <Text style={styles.note}>Panchangam data is provided by Navamsha using your saved location. General daily indicators are not a guarantee of personal outcomes and do not replace event-specific Telugu Drik Muhurtham analysis.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  poojaShortcut: { marginTop: 18, marginBottom: 8, padding: 16, borderRadius: 14, backgroundColor: "#71370F", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  poojaShortcutText: { flex: 1 },
  poojaShortcutTitle: { color: "#FFF7E9", fontSize: 14, fontWeight: "700" },
  poojaShortcutSubtitle: { color: "#F0D8B8", fontSize: 11, marginTop: 4 },
  poojaShortcutArrow: { color: "#F7D99F", fontSize: 10, fontWeight: "800", marginLeft: 8 },
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
  guidanceLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.2, fontWeight: "700", marginTop: 12, marginBottom: 5 },
  smallNote: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 10 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 15 },
});
