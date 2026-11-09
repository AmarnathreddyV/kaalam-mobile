import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppLanguage, useLanguage } from "../i18n";
import { colors } from "../theme/colors";

const languages: AppLanguage[] = ["English", "Telugu", "Hindi", "Tamil", "Malayalam", "Kannada", "Gujarati", "Marathi"];

export function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("Change app language")} onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={styles.label}>{t("Language")}</Text>
        <Text style={styles.value}>{language}  ▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setOpen(false)} style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t("Choose app language")}</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {languages.map(item => (
                <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: item === language }}
                  onPress={() => { setLanguage(item); setOpen(false); }} style={[styles.option, item === language && styles.selected]}>
                  <Text style={[styles.optionText, item === language && styles.selectedText]}>{item}</Text>
                  {item === language && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.cancel}><Text style={styles.cancelText}>{t("Cancel")}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, marginBottom: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(250,247,239,0.96)" },
  label: { color: colors.muted, fontSize: 11 },
  value: { color: colors.maroonDark, fontSize: 12, fontWeight: "700" },
  backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(25,15,12,0.52)" },
  sheet: { maxHeight: "75%", borderRadius: 16, padding: 18, backgroundColor: "#FAF7EF", borderWidth: 1, borderColor: colors.gold },
  title: { color: colors.maroonDark, fontFamily: "Georgia", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  list: { flexGrow: 0 },
  option: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line, borderRadius: 8 },
  selected: { backgroundColor: "rgba(169,133,69,0.15)" },
  optionText: { color: colors.text, fontSize: 14 },
  selectedText: { color: colors.maroonDark, fontWeight: "700" },
  check: { color: colors.gold, fontWeight: "800" },
  cancel: { alignItems: "center", paddingTop: 14 },
  cancelText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
});
