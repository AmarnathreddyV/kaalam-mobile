import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, StyleSheet } from "react-native";
import { Screen, PageHeading, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { supabase } from "../auth/supabase";

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
      <PageHeading title="Profile" subtitle="Your details and preferences" />
      <Panel>
        <Text style={styles.section}>PERSONAL DETAILS</Text>
        {loading ? <ActivityIndicator color={colors.maroon} /> : error ? <Text style={styles.footnote}>{error}</Text> : (
          <>
            <LabelValue label="Name" value={profile?.full_name || "Not added"} />
            <LabelValue label="Email" value={profile?.email || "Not added"} />
            <LabelValue label="Date of birth" value={profile?.date_of_birth || "Not added"} />
            <LabelValue label="Time of birth" value={profile?.time_of_birth || "Not added"} />
            <LabelValue label="Place of birth" value={profile?.birth_place || "Not added"} last />
          </>
        )}
      </Panel>
      <Text style={styles.heading}>Preferences & location</Text>
      <Panel>
        <LabelValue label="Current location" value={profile?.current_location || "Not set"} />
        <LabelValue label="Language" value={profile?.preferred_language || "English"} />
        <LabelValue label="Panchangam tradition" value={profile?.panchangam_tradition || "Telugu Drik"} last />
      </Panel>
      <Text style={styles.footnote}>Your profile and birth-chart data are read from the signed-in account and protected by Supabase row-level security. Profile editing will be added next.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  section: { color: colors.gold, fontSize: 9, letterSpacing: 1.4, fontWeight: "700", marginBottom: 4 },
  heading: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 25, marginBottom: 13 },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 17 },
});
