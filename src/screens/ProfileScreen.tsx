import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, StyleSheet, View, TouchableOpacity } from "react-native";
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

function displayBirthDate(value?: string) {
  if (!value) return "Not added";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

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
            <LabelValue label={t("Date of birth")} value={profile?.date_of_birth ? displayBirthDate(profile.date_of_birth) : t("Not added")} />
            <LabelValue label={t("Time of birth")} value={profile?.time_of_birth || t("Not added")} />
            <LabelValue label={t("Place of birth")} value={profile?.birth_place || t("Not added")} last />
          </>
        )}
      </Panel>
      <Text style={styles.heading}>{t("Preferences & location")}</Text>
      <Panel>
        <LabelValue label={t("Current location")} value={profile?.current_location || t("Not set")} />
        <LabelValue label={t("Language")} value={t(profile?.preferred_language || "English")} />
        <LabelValue label={t("Panchangam tradition")} value={t(profile?.panchangam_tradition || "Telugu Drik")} last />
      </Panel>
      <Text style={styles.heading}>{t("Preferred language")}</Text>
      <Text style={styles.footnote}>{t("Change the app language anytime. Your choice is saved automatically.")}</Text>
      <Panel>
        <View style={styles.languageRow}>
          {(["English", "Telugu", "Hindi", "Tamil", "Malayalam", "Kannada", "Gujarati", "Marathi"] as const).map(item => (
            <TouchableOpacity key={item} activeOpacity={0.75} onPress={async () => {
              setLanguage(item);
              const { data } = await supabase.auth.getUser();
              if (data.user) {
                const { error: saveError } = await supabase.from("profiles").update({ preferred_language: item }).eq("id", data.user.id);
                if (saveError) setError(saveError.message);
              }
              setProfile(current => ({ ...(current || {}), preferred_language: item }));
            }} style={[styles.language, language === item && styles.languageActive]} accessibilityRole="button" accessibilityState={{ selected: language === item }}>
              <Text style={[styles.languageText, language === item && styles.languageTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Panel>
      <Text style={styles.footnote}>{t("Your profile and birth-chart data are read from the signed-in account and protected by Supabase row-level security. Profile editing will be added next.")}</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  languageRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-start" },
  language: { minWidth: "30%", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 12 },
  languageActive: { backgroundColor: "#71370F", borderColor: colors.maroon },
  languageText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  languageTextActive: { color: "#FFFFFF" },
  section: { color: colors.gold, fontSize: 9, letterSpacing: 1.4, fontWeight: "700", marginBottom: 4 },
  heading: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 25, marginBottom: 13 },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 17 },
});
