import React from "react";
import { ScrollView, View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

export function Screen({ children }: { children: React.ReactNode }) {
  return <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

export function SectionTitle({ children, right }: { children: string; right?: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right ? <Text style={styles.sectionRight}>{right}</Text> : null}
    </View>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function LabelValue({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.labelValue, !last && styles.rowBorder]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.pageHeading}>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 40 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 30 },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "700", letterSpacing: 1.05, fontFamily: "Georgia" },
  sectionRight: { color: colors.gold, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 19 },
  labelValue: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  label: { color: colors.muted, fontSize: 12, letterSpacing: 0.15 },
  value: { color: colors.text, fontSize: 13, fontWeight: "600", letterSpacing: 0.15 },
  pageHeading: { marginBottom: 25 },
  pageTitle: { color: colors.maroonDark, fontSize: 32, fontWeight: "500", letterSpacing: -0.8, fontFamily: "Georgia" },
  pageSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
});
