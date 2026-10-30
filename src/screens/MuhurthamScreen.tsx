import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import { Screen, PageHeading, Panel } from "../components/Screen";
import { colors } from "../theme/colors";

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://kaalam-mobile.onrender.com"
).replace(/\/$/, "");

const occasions = [
  "Marriage",
  "Gruhapravesam",
  "Vehicle purchase",
  "Business opening",
  "Property registration",
  "Naming ceremony",
  "Travel",
  "Other",
];

const periods = [
  { label: "15 Days", days: 15 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year", days: 365 },
  { label: "Custom", days: 0 },
];

type PanchangResult = {
  date: string;
  data: Record<string, any>;
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function displayDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(originalDay, lastDay));

  return result;
}

export function MuhurthamScreen() {
  const [selected, setSelected] = useState("Gruhapravesam");

  const [customOccasion, setCustomOccasion] = useState("");

  const [selectedPeriod, setSelectedPeriod] = useState("3 Months");

  const [startDate, setStartDate] = useState(new Date());

  const [endDate, setEndDate] = useState(
    addMonths(new Date(), 3)
  );

  const [showStartPicker, setShowStartPicker] = useState(false);

  const [showEndPicker, setShowEndPicker] = useState(false);

  const [results, setResults] = useState<PanchangResult[]>([]);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  function changePeriod(label: string, days: number) {
    setSelectedPeriod(label);

    if (label !== "Custom") {
      const start = new Date();

      let end: Date;

      switch (label) {
        case "1 Month":
          end = addMonths(start, 1);
          break;

        case "3 Months":
          end = addMonths(start, 3);
          break;

        case "6 Months":
          end = addMonths(start, 6);
          break;

        case "1 Year":
          end = addMonths(start, 12);
          break;

        default:
          end = addDays(start, days);
      }

      setStartDate(start);
      setEndDate(end);
    }

    setResults([]);
    setError("");
  }

  function handleStartDateChange(
    event: any,
    selectedDate?: Date
  ) {
    setShowStartPicker(false);

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setStartDate(selectedDate);
    setSelectedPeriod("Custom");
    setResults([]);
    setError("");

    if (selectedDate > endDate) {
      setEndDate(selectedDate);
    }
  }

  function handleEndDateChange(
    event: any,
    selectedDate?: Date
  ) {
    setShowEndPicker(false);

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    if (selectedDate < startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    setEndDate(selectedDate);
    setSelectedPeriod("Custom");
    setResults([]);
    setError("");
  }

  async function searchMuhurtham() {
    const occasion =
      selected === "Other"
        ? customOccasion.trim()
        : selected;

    if (selected === "Other" && occasion.length < 3) {
      setError("Please describe your occasion.");
      return;
    }

    if (endDate < startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    const totalDays =
      Math.floor(
        (endDate.getTime() - startDate.getTime()) /
          86400000
      ) + 1;

    if (totalDays > 366) {
      setError("Please select a period of 366 days or less.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/muhurtham/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            occasion,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            latitude: 17.385,
            longitude: 78.4867,
            timezone: 5.5,
            tradition: "Telugu Drik",
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body?.detail || "Unable to retrieve Panchangam data."
        );
      }

      setResults(body.results || []);

      if (!body.results?.length) {
        setError("No Panchangam records were returned.");
      }
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to search dates.";

      setError(message);

      Alert.alert("Search Failed", message);
    } finally {
      setLoading(false);
    }
  }

  function getField(
    data: Record<string, any>,
    key: string
  ) {
    const value = data?.[key];

    if (!value) return "Not available";

    if (typeof value === "object") {
      return value.name || "Not available";
    }

    return String(value);
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeading
          title="Find Muhurtham"
          subtitle="Choose an occasion and search period."
        />

        <Text style={styles.label}>SELECT OCCASION</Text>

        <View style={styles.options}>
          {occasions.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => {
                setSelected(item);
                setResults([]);
                setError("");
              }}
              style={[
                styles.option,
                selected === item && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected === item && styles.optionTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected === "Other" && (
          <>
            <Text style={styles.label}>
              DESCRIBE YOUR OCCASION
            </Text>

            <TextInput
              value={customOccasion}
              onChangeText={setCustomOccasion}
              placeholder="Write your occasion"
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              maxLength={160}
            />
          </>
        )}

        <Text style={styles.label}>
          SELECT SEARCH PERIOD
        </Text>

        <View style={styles.periods}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.label}
              onPress={() =>
                changePeriod(period.label, period.days)
              }
              style={[
                styles.period,
                selectedPeriod === period.label &&
                  styles.periodSelected,
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period.label &&
                    styles.periodTextSelected,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>CHOOSE DATE RANGE</Text>

        <Panel>
          <Text style={styles.dateLabel}>FROM DATE</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateText}>
              {displayDate(startDate)}
            </Text>

            <Text style={styles.calendarIcon}>▦</Text>
          </TouchableOpacity>

          <Text style={styles.dateLabel}>TO DATE</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateText}>
              {displayDate(endDate)}
            </Text>

            <Text style={styles.calendarIcon}>▦</Text>
          </TouchableOpacity>

          <Text style={styles.rangeHint}>
            {selectedPeriod === "Custom"
              ? "Custom date range selected."
              : `${selectedPeriod} search period selected.`}
          </Text>
        </Panel>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            minimumDate={new Date(2000, 0, 1)}
            maximumDate={new Date(2100, 11, 31)}
            onChange={handleStartDateChange}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            minimumDate={startDate}
            maximumDate={addDays(startDate, 365)}
            onChange={handleEndDateChange}
          />
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={searchMuhurtham}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" />

              <Text style={styles.buttonText}>
                Fetching Panchangam...
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              Find Muhurtham
            </Text>
          )}
        </TouchableOpacity>

        {error ? (
          <Panel style={styles.result}>
            <Text style={styles.error}>{error}</Text>
          </Panel>
        ) : null}

        {results.length > 0 && (
          <>
            <Text style={styles.resultHeading}>
              PANCHANGAM RESULTS
            </Text>

            <Text style={styles.resultSubtitle}>
              {results.length} daily Panchangam records retrieved.
              These are not yet verified Muhurtham recommendations.
            </Text>

            {results.map((item) => (
              <Panel key={item.date} style={styles.result}>
                <Text style={styles.resultTitle}>
                  {item.date}
                </Text>

                {[
                  ["Tithi", "tithi"],
                  ["Nakshatra", "nakshatra"],
                  ["Yoga", "yoga"],
                  ["Karana", "karana"],
                  ["Weekday", "weekday"],
                ].map(([label, key]) => (
                  <View key={key} style={styles.resultRow}>
                    <Text style={styles.resultLabel}>
                      {label}
                    </Text>

                    <Text style={styles.resultValue}>
                      {getField(item.data, key)}
                    </Text>
                  </View>
                ))}
              </Panel>
            ))}
          </>
        )}

        <Text style={styles.disclaimer}>
          KAALAM uses Telugu Drik Panchangam data from Navamsha.
          Daily Panchangam snapshots are not confirmed auspicious
          timings. Occasion-specific Muhurtham calculations
          are still required.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "700",
    marginBottom: 11,
    marginTop: 18,
  },

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  option: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 247, 230, 0.94)",
  },

  optionSelected: {
    backgroundColor: "#71370F",
    borderColor: colors.maroon,
  },

  optionText: {
    color: colors.text,
    fontSize: 12,
  },

  optionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  periods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  period: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 247, 230, 0.94)",
  },

  periodSelected: {
    backgroundColor: "#71370F",
    borderColor: colors.maroon,
  },

  periodText: {
    color: colors.text,
    fontSize: 12,
  },

  periodTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  dateLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 10,
  },

  dateButton: {
    backgroundColor: "rgba(255, 248, 234, 0.96)",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 11,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },

  calendarIcon: {
    color: colors.maroon,
    fontSize: 20,
  },

  input: {
    backgroundColor: "rgba(255, 248, 234, 0.96)",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 11,
    padding: 14,
    color: colors.text,
    fontSize: 13,
    marginBottom: 12,
  },

  rangeHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 12,
  },

  button: {
    backgroundColor: "#71370F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  resultHeading: {
    color: colors.maroon,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 25,
  },

  resultSubtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },

  result: {
    marginTop: 13,
  },

  resultTitle: {
    color: colors.maroon,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  resultLabel: {
    color: colors.muted,
    fontSize: 12,
  },

  resultValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },

  error: {
    color: colors.maroon,
    fontSize: 12,
    lineHeight: 18,
  },

  disclaimer: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 25,
  },
});
