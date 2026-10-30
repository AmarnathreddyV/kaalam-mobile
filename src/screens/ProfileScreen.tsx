import React from "react";
import { Text, StyleSheet } from "react-native";
import { Screen, PageHeading, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";

export function ProfileScreen() {
  return (
    <Screen>
      <PageHeading title="Profile" subtitle="Your details and preferences" />
      <Panel>
        <Text style={styles.section}>PERSONAL DETAILS</Text>
        <LabelValue label="Name" value="Not added" />
        <LabelValue label="Date of birth" value="Not added" />
        <LabelValue label="Time of birth" value="Not added" />
        <LabelValue label="Place of birth" value="Not added" last />
      </Panel>
      <Text style={styles.heading}>Preferences</Text>
      <Panel>
        <LabelValue label="Current location" value="Not set" />
        <LabelValue label="Language" value="English" />
        <LabelValue label="Panchangam tradition" value="Not selected" last />
      </Panel>
      <Text style={styles.footnote}>Profile editing, secure sign-in and saved family profiles will be connected in the next development phase.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  section: { color: colors.gold, fontSize: 9, letterSpacing: 1.4, fontWeight: "700", marginBottom: 4 },
  heading: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 25, marginBottom: 13 },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 17 },
});
