import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, StyleSheet, View } from "react-native";
import { Screen, PageHeading, Panel } from "../components/Screen";
import { colors } from "../theme/colors";

const occasions = ["Marriage", "Gruhapravesam", "Vehicle purchase", "Business opening", "Property registration", "Naming ceremony", "Travel", "Other"];
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://kaalam-mobile.onrender.com").replace(/\/$/, "");

export function MuhurthamScreen() {
  const [selected, setSelected] = useState("Gruhapravesam");
  const [customOccasion, setCustomOccasion] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    const occasion = selected === "Other" ? customOccasion.trim() : selected;
    if (selected === "Other" && occasion.length < 3) {
      setError("Please describe your occasion.");
      return;
    }
    setLoading(true); setError(""); setAnalysis("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/occasion/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          location: "Hyderabad, Telangana, India",
          tradition: "Telugu Drik Panchangam",
          language: "English",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.detail || "Unable to analyze this occasion.");
      setAnalysis(body.analysis || "No analysis was returned.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to analyze this occasion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <PageHeading title="Find Muhurtham" subtitle="Choose an occasion to begin." />
      <Text style={styles.label}>OCCASION</Text>
      <View style={styles.options}>
        {occasions.map((item) => (
          <TouchableOpacity key={item} onPress={() => { setSelected(item); setAnalysis(""); setError(""); }} style={[styles.option, selected === item && styles.optionSelected]}>
            <Text style={[styles.optionText, selected === item && styles.optionTextSelected]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected === "Other" ? (
        <>
          <Text style={styles.label}>DESCRIBE YOUR OCCASION</Text>
          <TextInput
            value={customOccasion}
            onChangeText={(value) => { setCustomOccasion(value); setError(""); }}
            placeholder="Write your occasion here"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            maxLength={160}
          />
        </>
      ) : null}

      <Text style={styles.label}>DATE RANGE</Text>
      <Panel>
        <Text style={styles.range}>Next 3 months</Text>
        <Text style={styles.rangeHint}>Date range selection will be added with the Muhurtham search.</Text>
      </Panel>

      <TouchableOpacity style={styles.button} onPress={analyze} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{selected === "Other" ? "Analyze occasion with AI" : "Analyze occasion"}</Text>}
      </TouchableOpacity>

      {error ? <Panel style={styles.result}><Text style={styles.error}>{error}</Text></Panel> : null}
      {analysis ? (
        <Panel style={styles.result}>
          <Text style={styles.resultTitle}>Occasion analysis</Text>
          <Text style={styles.resultText}>{analysis}</Text>
        </Panel>
      ) : null}
      <Text style={styles.disclaimer}>AI helps understand the occasion and identify traditional factors to check. It does not create verified Muhurtham dates. Date recommendations require location-specific Panchangam calculations and event-specific rules.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 9, letterSpacing: 1.4, fontWeight: "700", marginBottom: 11, marginTop: 9 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 23 },
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "rgba(255, 247, 230, 0.94)" },
  optionSelected: { backgroundColor: "#71370F", borderColor: colors.maroon },
  optionText: { color: colors.text, fontSize: 12 },
  optionTextSelected: { color: "#FFFFFF", fontWeight: "600" },
  input: { minHeight: 88, textAlignVertical: "top", backgroundColor: "rgba(255, 247, 230, 0.94)", borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 14, color: colors.text, fontSize: 13, marginBottom: 20 },
  range: { color: colors.text, fontSize: 14, fontWeight: "600" },
  rangeHint: { color: colors.muted, fontSize: 11, marginTop: 6 },
  button: { backgroundColor: "#71370F", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  result: { marginTop: 16 },
  resultTitle: { color: colors.maroon, fontSize: 14, fontWeight: "700", marginBottom: 9 },
  resultText: { color: colors.text, fontSize: 12, lineHeight: 20 },
  error: { color: colors.maroon, fontSize: 12, lineHeight: 18 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 17 },
});
