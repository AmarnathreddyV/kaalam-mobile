import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, StyleSheet } from "react-native";
import { Screen, PageHeading, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { supabase } from "../auth/supabase";
import { useLanguage } from "../i18n";

type ChartSummary = { rashi?: string; nakshatra?: string; pada?: number; lagna?: string };
type ChartProfile = {
  date_of_birth?: string;
  time_of_birth?: string;
  birth_place?: string;
  birth_chart_summary?: ChartSummary | null;
  birth_chart_calculated_at?: string | null;
};

function displayBirthDate(value?: string) {
  if (!value) return "Not added";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

export function HoroscopeScreen() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ChartProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: loadError } = await supabase.from("profiles")
        .select("date_of_birth,time_of_birth,birth_place,birth_chart_summary,birth_chart_calculated_at")
        .maybeSingle();
      if (!active) return;
      if (loadError) setError(loadError.message);
      else setProfile(data as ChartProfile | null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const chart = profile?.birth_chart_summary;
  return (
    <Screen>
      <PageHeading title={t("Horoscope")} subtitle={t("Your Vedic birth-chart details")} />
      <Panel>
        <Text style={styles.eyebrow}>{t("BIRTH CHART · NAVAMSHA")}</Text>
        <Text style={styles.title}>{t("Personal horoscope")}</Text>
        <Text style={styles.body}>{t("Calculated from your saved birth date, exact time and geocoded birthplace using the Vedic sidereal chart settings.")}</Text>
      </Panel>
      <Text style={styles.heading}>{t("Your birth chart")}</Text>
      <Panel>
        {loading ? <ActivityIndicator color={colors.maroon} /> : error ? <Text style={styles.body}>{error}</Text> : (
          <>
            <LabelValue label={t("Chandra Rashi")} value={chart?.rashi || t("Not calculated")} />
            <LabelValue label={t("Janma Nakshatra")} value={chart?.nakshatra || t("Not calculated")} />
            <LabelValue label={t("Nakshatra Pada")} value={chart?.pada != null ? String(chart.pada) : t("Not calculated")} />
            <LabelValue label={t("Lagna")} value={chart?.lagna || t("Not calculated")} last />
          </>
        )}
      </Panel>
      <Text style={styles.heading}>{t("Birth details")}</Text>
      <Panel>
        <LabelValue label={t("Date")} value={profile?.date_of_birth ? displayBirthDate(profile.date_of_birth) : t("Not added")} />
        <LabelValue label={t("Time")} value={profile?.time_of_birth || t("Not added")} />
        <LabelValue label={t("Place")} value={profile?.birth_place || t("Not added")} last />
      </Panel>
      <Text style={styles.footnote}>{t("Astrological interpretations are traditional cultural guidance, not guaranteed predictions or professional advice. If birth details change, recalculate the chart.")}</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.4, fontWeight: "700" },
  title: { color: colors.maroonDark, fontSize: 23, fontWeight: "600", fontFamily: "Georgia", marginTop: 11 },
  body: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 9 },
  heading: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 25, marginBottom: 13 },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 17 },
});
