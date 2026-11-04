import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, StyleSheet, View } from "react-native";
import { Screen, PageHeading, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { supabase } from "../auth/supabase";
import { useLanguage } from "../i18n";

type Profile = {
  full_name?: string;
  email?: string;
  date_of_birth?: string;
  time_of_birth?: string;
  birth_place?: string;
  current_location?: string;
  preferred_language?: string;
  panchangam_tradition?: string;
};

export function ProfileScreen() {
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: loadError } = await supabase.from("profiles")
        .select("full_name,email,date_of_birth,time_of_birth,birth_place,current_location,preferred_language,panchangam_tradition")
        .maybeSingle();
      if (!active) return;
      if (loadError) setError(loadError.message);
      else setProfile(data as Profile | null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return (
    <Screen>
      <PageHeading title={t("Profile")} subtitle={t("Your details and preferences")} />
      <Panel>
        <Text style={styles.section}>{t("PERSONAL DETAILS")}</Text>
        {loading ? <ActivityIndicator color={colors.maroon} /> : error ? <Text style={styles.footnote}>{error}</Text> : (
          <>
            <LabelValue label={t("Name")} value={profile?.full_name || t("Not added")} />
            <LabelValue label={t("Email")} value={profile?.email || t("Not added")} />
            <LabelValue label={t("Date of birth")} value={profile?.date_of_birth || t("Not added")} />
            <LabelValue label={t("Time of birth")} value={profile?.time_of_birth || t("Not added")} />
            <LabelValue label="Place of birth" value={profile?.birth_place || "Not added"} last />
          </>
        )}
      </Panel>
      <Text style={styles.heading}>{t("Preferences & location")}</Text>
      <Panel>
        <LabelValue label={t("Current location")} value={profile?.current_location || t("Not set")} />
        <LabelValue label={t("Language")} value={profile?.preferred_language || "English"} />
        <LabelValue label={t("Panchangam tradition")} value={profile?.panchangam_tradition || "Telugu Drik"} last />
      </Panel>
      <Text style={styles.heading}>{t("Preferred language")}</Text>
      <Panel>
        <View style={styles.languageRow}>
          {(["Telugu", "Hindi", "English"] as const).map(item => (
            <Text key={item} onPress={async () => {
              setLanguage(item);
              const { data } = await supabase.auth.getUser();
              if (data.user) await supabase.from("profiles").update({ preferred_language: item }).eq("id", data.user.id);
              setProfile(current => current ? { ...current, preferred_language: item } : current);
            }} style={[styles.language, language === item && styles.languageActive]}>{item}</Text>
          ))}
        </View>
      </Panel>
      <Text style={styles.footnote}>{t("Your profile and birth-chart data are read from the signed-in account and protected by Supabase row-level security. Profile editing will be added next.")}</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  languageRow: { flexDirection: "row", gap: 9 },
  language: { color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 13, overflow: "hidden" },
  languageActive: { color: "#FFFFFF", backgroundColor: "#71370F", borderColor: colors.maroon },
  section: { color: colors.gold, fontSize: 9, letterSpacing: 1.4, fontWeight: "700", marginBottom: 4 },
  heading: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 25, marginBottom: 13 },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 17 },
});
