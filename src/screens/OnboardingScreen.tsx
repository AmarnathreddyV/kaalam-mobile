import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../auth/supabase";
import { colors } from "../theme/colors";

const fields = [
  { key: "date_of_birth", label: "Date of birth (YYYY-MM-DD)", placeholder: "1998-04-21" },
  { key: "time_of_birth", label: "Time of birth (24-hour)", placeholder: "06:30" },
  { key: "birth_place", label: "Place of birth", placeholder: "City, State, Country" },
  { key: "current_location", label: "Current location", placeholder: "City, State, Country" },
] as const;

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({
    full_name: "", date_of_birth: "", time_of_birth: "", birth_place: "", current_location: "",
    preferred_language: "English", panchangam_tradition: "Telugu Drik",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value }));

  async function save() {
    if (!values.full_name.trim() || !values.date_of_birth.trim() || !values.time_of_birth.trim() || !values.birth_place.trim() || !values.current_location.trim()) {
      setError("Please complete all fields to personalize your Panchangam.");
      return;
    }
    setBusy(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again.");
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: auth.user.id,
        email: auth.user.email,
        full_name: values.full_name.trim(),
        date_of_birth: values.date_of_birth.trim(),
        time_of_birth: values.time_of_birth.trim(),
        birth_place: values.birth_place.trim(),
        current_location: values.current_location.trim(),
        preferred_language: values.preferred_language,
        panchangam_tradition: values.panchangam_tradition,
        onboarding_complete: true,
      });
      if (saveError) throw saveError;
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
    } finally { setBusy(false); }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>KAALAM</Text>
      <Text style={styles.title}>Your details</Text>
      <Text style={styles.subtitle}>These details are used to personalize your horoscope and date recommendations.</Text>
      <TextInput value={values.full_name} onChangeText={(v) => update("full_name", v)} placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input} />
      {fields.map((f) => (
        <View key={f.key}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput value={values[f.key]} onChangeText={(v) => update(f.key, v)} placeholder={f.placeholder} placeholderTextColor={colors.muted} style={styles.input} />
        </View>
      ))}
      <Text style={styles.label}>Preferred language</Text>
      <View style={styles.pills}>
        {["Telugu", "English", "Hindi"].map((v) => <TouchableOpacity key={v} onPress={() => update("preferred_language", v)} style={[styles.pill, values.preferred_language === v && styles.pillSelected]}><Text style={[styles.pillText, values.preferred_language === v && styles.pillTextSelected]}>{v}</Text></TouchableOpacity>)}
      </View>
      <Text style={styles.label}>Panchangam tradition</Text>
      <View style={styles.pills}>
        {["Telugu Drik", "Telugu Vakya"].map((v) => <TouchableOpacity key={v} onPress={() => update("panchangam_tradition", v)} style={[styles.pill, values.panchangam_tradition === v && styles.pillSelected]}><Text style={[styles.pillText, values.panchangam_tradition === v && styles.pillTextSelected]}>{v}</Text></TouchableOpacity>)}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity disabled={busy} onPress={save} style={styles.button}><Text style={styles.buttonText}>{busy ? "Saving…" : "Save and continue"}</Text></TouchableOpacity>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 25, paddingBottom: 45 },
  brand: { color: colors.maroon, fontSize: 21, fontWeight: "700", letterSpacing: 5, marginTop: 20, marginBottom: 35 },
  title: { color: colors.maroonDark, fontSize: 30, fontWeight: "600", fontFamily: "Georgia" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 24 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600", marginBottom: 7, marginTop: 5 },
  input: { backgroundColor: "rgba(255, 248, 234, 0.96)", borderColor: colors.line, borderWidth: 1, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 14, color: colors.text, fontSize: 13, marginBottom: 13 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  pill: { borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: "rgba(255, 248, 234, 0.96)" },
  pillSelected: { backgroundColor: "#71370F", borderColor: colors.maroon },
  pillText: { color: colors.text, fontSize: 12 },
  pillTextSelected: { color: "#FFFFFF", fontWeight: "600" },
  button: { backgroundColor: "#71370F", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  error: { color: colors.maroon, fontSize: 12, marginBottom: 10 },
});
