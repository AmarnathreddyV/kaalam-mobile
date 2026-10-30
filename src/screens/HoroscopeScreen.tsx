import React from "react";
import { Text, StyleSheet } from "react-native";
import { Screen, PageHeading, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";

export function HoroscopeScreen() {
  return (
    <Screen>
      <PageHeading title="Horoscope" subtitle="Your daily reading" />
      <Panel>
        <Text style={styles.eyebrow}>BIRTH CHART</Text>
        <Text style={styles.title}>Personal horoscope</Text>
        <Text style={styles.body}>Add your date, exact time and place of birth in your profile to calculate your Vedic birth chart and prepare a personalized reading.</Text>
      </Panel>
      <Text style={styles.heading}>Your birth details</Text>
      <Panel>
        <LabelValue label="Rashi" value="Awaiting birth details" />
        <LabelValue label="Nakshatra" value="Awaiting birth details" />
        <LabelValue label="Pada" value="Awaiting birth details" last />
      </Panel>
      <Text style={styles.footnote}>Astrological interpretations are traditional guidance, not guaranteed predictions or professional advice.</Text>
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
