import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Screen, PageHeading, Panel } from "../components/Screen";
import { colors } from "../theme/colors";

const occasions = ["Marriage", "Gruhapravesam", "Vehicle purchase", "Business opening", "Property registration", "Naming ceremony", "Travel", "Other"];

export function MuhurthamScreen() {
  const [selected, setSelected] = useState("Gruhapravesam");
  const [showMessage, setShowMessage] = useState(false);
  return (
    <Screen>
      <PageHeading title="Find Muhurtham" subtitle="Choose an occasion to begin." />
      <Text style={styles.label}>OCCASION</Text>
      <View style={styles.options}>
        {occasions.map((item) => (
          <TouchableOpacity key={item} onPress={() => { setSelected(item); setShowMessage(false); }} style={[styles.option, selected === item && styles.optionSelected]}>
            <Text style={[styles.optionText, selected === item && styles.optionTextSelected]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>DATE RANGE</Text>
      <Panel>
        <Text style={styles.range}>Next 3 months</Text>
        <Text style={styles.rangeHint}>Date range selector will be added with the search service.</Text>
      </Panel>
      <TouchableOpacity style={styles.button} onPress={() => setShowMessage(true)}>
        <Text style={styles.buttonText}>Find suitable dates</Text>
      </TouchableOpacity>
      {showMessage ? (
        <Panel style={styles.result}>
          <Text style={styles.resultTitle}>Muhurtham search</Text>
          <Text style={styles.resultText}>Your selection: {selected}. Connect the Panchangam calculation engine and event-specific rules to generate verified date and time recommendations.</Text>
        </Panel>
      ) : null}
      <Text style={styles.disclaimer}>Auspicious-date recommendations will follow the selected regional tradition and event-specific rules. This preview does not generate real Muhurtham results.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 9, letterSpacing: 1.4, fontWeight: "700", marginBottom: 11, marginTop: 9 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 23 },
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface },
  optionSelected: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  optionText: { color: colors.text, fontSize: 12 },
  optionTextSelected: { color: "#FFFFFF", fontWeight: "600" },
  range: { color: colors.text, fontSize: 14, fontWeight: "600" },
  rangeHint: { color: colors.muted, fontSize: 11, marginTop: 6 },
  button: { backgroundColor: colors.maroon, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  result: { marginTop: 16 },
  resultTitle: { color: colors.maroon, fontSize: 14, fontWeight: "700", marginBottom: 7 },
  resultText: { color: colors.text, fontSize: 12, lineHeight: 19 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 17 },
});
