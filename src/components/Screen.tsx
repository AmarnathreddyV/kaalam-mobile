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
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 34 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13, marginTop: 25 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "700", letterSpacing: 0.35, fontFamily: "Georgia" },
  sectionRight: { color: colors.gold, fontSize: 11, fontWeight: "600" },
  panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 17, shadowColor: "#4B260B", shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  labelValue: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  label: { color: colors.muted, fontSize: 13 },
  value: { color: colors.text, fontSize: 13, fontWeight: "600" },
  pageHeading: { marginBottom: 20 },
  pageTitle: { color: colors.maroonDark, fontSize: 29, fontWeight: "600", letterSpacing: -0.5, fontFamily: "Georgia" },
  pageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
