import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PageHeading, Panel } from "../components/Screen";
import { colors } from "../theme/colors";
import { useLanguage } from "../i18n";

const lists: Record<string, { title: string; items: string[]; note: string }> = {
  "Gruhapravesam": {
    title: "Gruhapravesam Pooja Samagri",
    note: "A general checklist only. Exact items and quantities vary by family tradition, priest, region and the type of homam. Confirm the final list with your purohit.",
    items: [
      "Kalasham, copper/brass pot and mango leaves",
      "Coconut, turmeric, kumkum and sandalwood",
      "Akshata (rice mixed with turmeric)",
      "Betel leaves and betel nuts",
      "Flowers, garlands and loose flower petals",
      "Fruits and seasonal offerings",
      "Camphor, incense sticks and dhoop",
      "Cotton wicks, diya and ghee or oil",
      "Panchapatra and uddharini",
      "Bell, pooja plate and small bowls",
      "New cloth for kalasham and deity",
      "Rice, wheat and other grains as instructed",
      "Milk for boiling over (paal pongal)",
      "Jaggery, sugar, rice and milk for prasadam",
      "Coconuts for breaking and offering",
      "Havan kund and homam materials, if homam is planned",
      "Samidha, ghee, havan samagri and darbha, as prescribed",
      "Mats, towels and clean vessels",
      "Drinking water and items for guests"
    ]
  },
  "Satyanarayana Vratham": {
    title: "Satyanarayana Vratham Pooja Samagri",
    note: "Confirm the vratam-specific prasadam recipe and quantities with the priest or your family tradition.",
    items: ["Satyanarayana Swamy photo or idol", "Panchamrutam ingredients", "Bananas and other fruits", "Wheat rava or wheat flour for prasadam", "Sugar or jaggery and ghee", "Tulasi leaves", "Flowers and garland", "Coconut and betel nuts", "Betel leaves", "Turmeric, kumkum and sandalwood", "Akshata", "Kalasham and mango leaves", "Camphor, incense and diya", "Pooja plates and vessels"]
  },
  "Ganesh Pooja": {
    title: "Ganesh Pooja Samagri",
    note: "Modakam and other naivedyam choices differ by regional practice.",
    items: ["Lord Ganesha idol or photo", "Durva grass / garika", "Red flowers", "Modak or undrallu", "Coconut", "Bananas and other fruits", "Jaggery", "Turmeric and kumkum", "Sandalwood paste", "Akshata", "Betel leaves and nuts", "Incense, camphor and diya", "Kalasham and mango leaves"]
  },
  "Lakshmi Pooja": {
    title: "Lakshmi Pooja Samagri",
    note: "Use the items and offerings customary in your household.",
    items: ["Goddess Lakshmi photo or idol", "Lotus or other fresh flowers", "Garland", "Turmeric, kumkum and sandalwood", "Akshata", "Kalasham and mango leaves", "Coconut and betel nuts", "Betel leaves", "Fruits and sweets", "Coins for symbolic offering", "Diya, oil or ghee and cotton wicks", "Incense and camphor", "Pooja plate and clean cloth"]
  },
  "Rudrabhishekam": {
    title: "Rudrabhishekam Samagri",
    note: "Abhishekam substances and sequence should be confirmed with the temple or priest.",
    items: ["Shiva lingam or Shiva photo", "Clean water", "Milk, curd, honey and ghee if prescribed", "Sugar or panchamrutam ingredients", "Bilva leaves", "Flowers", "Vibhuti", "Sandalwood paste", "Coconut and fruits", "Akshata", "Kalasham and vessels", "Diya, incense and camphor"]
  },
  "Namakaranam": {
    title: "Namakaranam Ceremony Samagri",
    note: "The ceremony format varies. Ask your priest for the exact list and any baby-specific arrangements.",
    items: ["Baby's clean traditional clothing", "Cradle or comfortable clean resting place", "Kalasham and mango leaves", "Turmeric, kumkum and sandalwood", "Akshata", "Flowers and garland", "Coconut and betel nuts", "Betel leaves", "Fruits and sweets", "Diya, incense and camphor", "Pooja plates and clean cloth"]
  },
  "Annaprashana": {
    title: "Annaprashana Ceremony Samagri",
    note: "Follow your paediatrician's advice on the baby's first foods; the ritual menu is not medical feeding advice.",
    items: ["Baby's traditional clothing", "Small clean silver or steel bowl and spoon", "Rice or food chosen with family and paediatrician", "Ghee if appropriate and approved", "Kalasham", "Turmeric, kumkum and akshata", "Flowers", "Coconut and fruits", "Diya, incense and camphor", "Pooja plate and clean cloth"]
  },
  "Bhoomi Pooja": {
    title: "Bhoomi Pooja Samagri",
    note: "The site ritual and required items depend on the priest's procedure and local custom.",
    items: ["Kalasham and mango leaves", "Coconut", "Turmeric, kumkum and sandalwood", "Akshata", "Flowers and garland", "Betel leaves and nuts", "Fruits and coconuts", "Navadhanyam if prescribed", "Milk and sweets", "Diya, oil or ghee, cotton wicks", "Incense and camphor", "Pooja plates and clean vessels"]
  }
};

export function PoojaItemsScreen() {
  const { t } = useLanguage();
  const names = useMemo(() => Object.keys(lists), []);
  const [selected, setSelected] = useState("Gruhapravesam");
  const current = lists[selected];
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <PageHeading title={t("Pooja Items")} subtitle={t("Preparation checklists for common Hindu ceremonies and poojas.")} />
      <Text style={styles.label}>{t("CHOOSE AN OCCASION")}</Text>
      <View style={styles.options}>
        {names.map(name => <TouchableOpacity key={name} onPress={() => setSelected(name)} style={[styles.chip, selected === name && styles.chipActive]}><Text style={[styles.chipText, selected === name && styles.chipTextActive]}>{name}</Text></TouchableOpacity>)}
      </View>
      <Panel style={styles.panel}>
        <Text style={styles.title}>{t(current.title)}</Text>
        <Text style={styles.note}>{t(current.note)}</Text>
        <Text style={styles.count}>{current.items.length} {t("ITEMS")}</Text>
        {current.items.map((item, index) => (
          <View key={item} style={styles.item}>
            <Text style={styles.number}>{String(index + 1).padStart(2, "0")}</Text>
            <Text style={styles.itemText}>{t(item)}</Text>
          </View>
        ))}
      </Panel>
      <Text style={styles.footer}>This checklist is a planning aid, not a definitive ritual prescription. Your family priest's instructions take priority.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 38 },
  label: { color: colors.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: "700", marginBottom: 10 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: "rgba(255,247,230,0.94)" },
  chipActive: { backgroundColor: "#71370F", borderColor: colors.maroon },
  chipText: { color: colors.text, fontSize: 11 },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  panel: { marginTop: 2 },
  title: { color: colors.maroonDark, fontFamily: "Georgia", fontSize: 20, fontWeight: "700" },
  note: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 8, marginBottom: 16 },
  count: { color: colors.gold, fontSize: 9, fontWeight: "700", letterSpacing: 1.3, marginBottom: 5 },
  item: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  number: { width: 30, color: colors.gold, fontSize: 11, fontWeight: "700", paddingTop: 2 },
  itemText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 15 }
});
