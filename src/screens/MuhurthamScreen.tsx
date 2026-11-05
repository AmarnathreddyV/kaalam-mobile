import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity,
  View, Platform, TextInput,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PageHeading, Panel } from "../components/Screen";
import { colors } from "../theme/colors";
import { supabase } from "../auth/supabase";
import { useLanguage, getAppLocale } from "../i18n";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://kaalam-mobile.onrender.com").replace(/\/$/, "");

const occasionGroups = [
  { title: "Family & life ceremonies", items: ["Marriage", "Engagement", "Gruhapravesam", "Namakarana (Naming ceremony)", "Annaprashana (First feeding)", "Upanayana", "Vidyarambha (Education beginning)", "Seemantham", "Birthday / Ayushya homam"] },
  { title: "Property, home & construction", items: ["Land registration", "Property registration", "Bhoomi puja", "House construction start", "House renovation", "Griha pravesam / Gruhapravesam"] },
  { title: "Work, business & education", items: ["New job joining", "Job interview", "Important meeting", "Signing an agreement", "Business inauguration", "New business start", "Office opening", "Shop opening", "Examination", "Course / college admission"] },
  { title: "Travel, purchases & other beginnings", items: ["Vehicle purchase", "Vehicle delivery", "Journey / travel start", "Buying gold", "Buying property", "New investment", "Starting a project", "Launching a website / product", "Medical procedure (consult your clinician)", "Other custom event"] },
];

const periods = [
  { label: "15 Days", type: "days", value: 15 },
  { label: "1 Month", type: "months", value: 1 },
  { label: "3 Months", type: "months", value: 3 },
  { label: "6 Months", type: "months", value: 6 },
  { label: "1 Year", type: "months", value: 12 },
  { label: "Custom", type: "custom", value: 0 },
];

type PanchangResult = { date: string; data: Record<string, any> };

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function displayDate(date: Date, language: string) {
  const locale = getAppLocale(language as import("../i18n").AppLanguage);
  return date.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
}
function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
}
function offsetForTimezone(timezone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(date);
  const value = parts.find(part => part.type === "timeZoneName")?.value || "GMT+00:00";
  const match = value.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) + Number(match[3]) / 60);
}
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function MuhurthamScreen() {
  const { t, language } = useLanguage();
  const [selected, setSelected] = useState("Gruhapravesam");
  const [customOccasion, setCustomOccasion] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("3 Months");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addMonths(new Date(), 3));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [results, setResults] = useState<PanchangResult[]>([]);
  const [activeResult, setActiveResult] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const occasions = useMemo(() => occasionGroups.flatMap(group => group.items), []);
  function changePeriod(label: string) {
    setSelectedPeriod(label);
    if (label !== "Custom") {
      const period = periods.find(item => item.label === label)!;
      const start = new Date();
      setStartDate(start);
      setEndDate(period.type === "days" ? addDays(start, period.value) : addMonths(start, period.value));
    }
    setResults([]);
    setActiveResult(0);
    setError("");
  }
  function onStartChange(event: any, value?: Date) {
    setShowStartPicker(false);
    if (event.type === "dismissed" || !value) return;
    setStartDate(value);
    setSelectedPeriod("Custom");
    if (value > endDate) setEndDate(value);
    setResults([]);
    setActiveResult(0);
    setError("");
  }
  function onEndChange(event: any, value?: Date) {
    setShowEndPicker(false);
    if (event.type === "dismissed" || !value) return;
    if (value < startDate) { setError("End date cannot be earlier than start date."); return; }
    setEndDate(value);
    setSelectedPeriod("Custom");
    setResults([]);
    setActiveResult(0);
    setError("");
  }

  async function search() {
    const occasion = selected === "Other custom event" ? customOccasion.trim() : selected;
    if (selected === "Other custom event" && occasion.length < 3) {
      setError("Please describe your occasion in at least 3 characters.");
      return;
    }
    if (endDate < startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    if (totalDays > 366) {
      setError("Choose a date range of no more than 366 days.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setActiveResult(0);
    try {
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("current_location,current_latitude,current_longitude,current_timezone")
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.current_latitude == null || profile?.current_longitude == null || !profile?.current_timezone) {
        throw new Error("Your current location has not been resolved. Complete or update your profile first.");
      }

      const response = await fetch(`${API_BASE_URL}/api/muhurtham/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          latitude: profile.current_latitude,
          longitude: profile.current_longitude,
          timezone: offsetForTimezone(profile.current_timezone, startDate),
          tradition: "Telugu Drik",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.detail || "Unable to validate the selected date range.");

      // Never interpret daily snapshots as an event-specific Muhurtham.
      if (body.recommendations_ready !== true || !["verified_muhurtham_candidates", "published_muhurtham_listings"].includes(body.result_type)) {
        setError(body?.message || "Event-specific Telugu Drik Muhurtham calculations are not validated yet. No dates will be labelled auspicious.");
        return;
      }

      const candidates = Array.isArray(body.recommendations) ? body.recommendations : [];
      if (!candidates.length) {
        setError(body?.message || "No published dates were found in this range.");
        return;
      }
      setResults(candidates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete the Muhurtham search.");
    } finally {
      setLoading(false);
    }
  }

  const active = results[activeResult];
  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <PageHeading title={t("Check a date for an event")} subtitle={t("Choose an event and date range to find dates and timings from published calendars.")} />
        <Panel style={styles.noticePanel}><Text style={styles.noticeTitle}>{t("Published calendar data")}</Text><Text style={styles.noticeText}>{t("KAALAM searches its collected, source-attributed Muhurtham calendars and displays their published dates and timings. These listings are not personalized; confirm the final Muhurtham with your family priest.")}</Text></Panel>
        <Text style={styles.label}>{t("SELECT YOUR EVENT")}</Text>
        {occasionGroups.map(group => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{t(group.title)}</Text>
            <View style={styles.options}>
              {group.items.map(item => (
                <TouchableOpacity key={item} onPress={() => { setSelected(item); setResults([]); setError(""); }} style={[styles.option, selected === item && styles.optionSelected]}>
                  <Text style={[styles.optionText, selected === item && styles.optionTextSelected]}>{t(item)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        {selected === "Other custom event" && (
          <>
            <Text style={styles.label}>{t("DESCRIBE YOUR EVENT")}</Text>
            <TextInput value={customOccasion} onChangeText={setCustomOccasion} placeholder={t("Describe the event")} placeholderTextColor={colors.muted} style={styles.input} multiline maxLength={160} />
          </>
        )}
        <Text style={styles.label}>{t("SELECT SEARCH PERIOD")}</Text>
        <View style={styles.options}>
          {periods.map(period => (
            <TouchableOpacity key={period.label} onPress={() => changePeriod(period.label)} style={[styles.option, selectedPeriod === period.label && styles.optionSelected]}>
              <Text style={[styles.optionText, selectedPeriod === period.label && styles.optionTextSelected]}>{t(period.label)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>{t("DATE RANGE")}</Text>
        <Panel>
          <Text style={styles.dateLabel}>{t("FROM")}</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
            <Text style={styles.dateText}>{displayDate(startDate, language)}</Text><Text style={styles.calendar}>▦</Text>
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{t("TO")}</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
            <Text style={styles.dateText}>{displayDate(endDate, language)}</Text><Text style={styles.calendar}>▦</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{t(selectedPeriod === "Custom" ? "Custom range" : selectedPeriod)}</Text>
        </Panel>
        {showStartPicker && <DateTimePicker value={startDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "calendar"} onChange={onStartChange} />}
        {showEndPicker && <DateTimePicker value={endDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "calendar"} minimumDate={startDate} maximumDate={addDays(startDate, 365)} onChange={onEndChange} />}
        <TouchableOpacity style={styles.button} onPress={search} disabled={loading}>
          {loading ? <View style={styles.loading}><ActivityIndicator color="#FFF" /><Text style={styles.buttonText}>{t("Searching published dates…")}</Text></View> : <Text style={styles.buttonText}>{t("Find suitable dates")}</Text>}
        </TouchableOpacity>
        {!!error && <Panel style={styles.result}><Text style={styles.error}>{t(error)}</Text></Panel>}
        {!!active && (
          <Panel style={styles.result}>
            <Text style={styles.resultEyebrow}>PUBLISHED DATE {activeResult + 1} OF {results.length}</Text>
            <Text style={styles.resultDate}>{active.date}</Text>
            <Text style={styles.resultTime}>{active.start_time} – {active.end_time}</Text>
            {!!active.reason && <Text style={styles.reason}>{t(active.reason)}</Text>}
            <View style={styles.navigation}>
              <TouchableOpacity disabled={activeResult === 0} onPress={() => setActiveResult(index => Math.max(0, index - 1))} style={[styles.navButton, activeResult === 0 && styles.disabled]}>
                <Text style={styles.navText}>{t("Previous date")}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={activeResult >= results.length - 1} onPress={() => setActiveResult(index => Math.min(results.length - 1, index + 1))} style={[styles.navButton, activeResult >= results.length - 1 && styles.disabled]}>
                <Text style={styles.navText}>{t("Find another date →")}</Text>
              </TouchableOpacity>
            </View>
          </Panel>
        )}
        <Text style={styles.disclaimer}>{t("Only a validated Telugu Drik Muhurtha calculation can mark a date and time as suitable. Daily Panchangam snapshots alone are not sufficient.")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: "700", marginBottom: 11, marginTop: 19 },
  noticePanel: { marginTop: 14, borderColor: "rgba(113, 55, 15, 0.28)", borderWidth: 1 },
  noticeTitle: { color: colors.maroonDark, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  noticeText: { color: "#4A2B16", fontSize: 12, lineHeight: 19 },
  group: { marginBottom: 8 },
  groupTitle: { color: colors.maroonDark, fontSize: 13, fontWeight: "700", marginBottom: 9 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: "rgba(255, 247, 230, 0.94)" },
  optionSelected: { backgroundColor: "#71370F", borderColor: colors.maroon },
  optionText: { color: colors.text, fontSize: 11 },
  optionTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  input: { backgroundColor: "rgba(255,248,234,0.96)", borderColor: colors.line, borderWidth: 1, borderRadius: 11, padding: 14, color: colors.text, marginBottom: 10 },
  dateLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 8, marginBottom: 8 },
  dateButton: { backgroundColor: "rgba(255,248,234,0.96)", borderColor: colors.line, borderWidth: 1, borderRadius: 11, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  calendar: { color: colors.maroon, fontSize: 19 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 10 },
  button: { backgroundColor: "#71370F", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  loading: { flexDirection: "row", alignItems: "center", gap: 10 },
  result: { marginTop: 18 },
  resultEyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.2, fontWeight: "700" },
  resultDate: { color: colors.maroonDark, fontFamily: "Georgia", fontSize: 24, fontWeight: "700", marginTop: 11 },
  resultTime: { color: colors.maroon, fontSize: 17, fontWeight: "700", marginTop: 8 },
  reason: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  navigation: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 18 },
  navButton: { backgroundColor: colors.pale, padding: 12, borderRadius: 10, flex: 1, alignItems: "center" },
  navText: { color: colors.maroonDark, fontSize: 11, fontWeight: "700" },
  disabled: { opacity: 0.35 },
  error: { color: colors.maroon, fontSize: 12, lineHeight: 18 },
  disclaimer: { color: "#3F210D", backgroundColor: "rgba(255, 246, 226, 0.96)", borderColor: "rgba(113, 55, 15, 0.24)", borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 12, lineHeight: 19, marginTop: 18, marginBottom: 25 },
});
