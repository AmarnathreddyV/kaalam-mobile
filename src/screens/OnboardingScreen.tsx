import React, { useState } from "react";

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

import { supabase } from "../auth/supabase";
import { colors } from "../theme/colors";

const fields = [
  {
    key: "date_of_birth",
    label: "Date of birth (YYYY-MM-DD)",
    placeholder: "1998-04-21",
  },
  {
    key: "time_of_birth",
    label: "Time of birth (24-hour format)",
    placeholder: "06:30",
  },
  {
    key: "birth_place",
    label: "Place of birth",
    placeholder: "City, State, Country",
  },
  {
    key: "current_location",
    label: "Current location",
    placeholder: "City, State, Country",
  },
] as const;

type ProfileValues = {
  full_name: string;
  date_of_birth: string;
  time_of_birth: string;
  birth_place: string;
  current_location: string;
  preferred_language: string;
};

export function OnboardingScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [values, setValues] = useState<ProfileValues>({
    full_name: "",
    date_of_birth: "",
    time_of_birth: "",
    birth_place: "",
    current_location: "",
    preferred_language: "English",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: string) => {
    setValues((old) => ({
      ...old,
      [key]: value,
    }));
  };

  // Validate date
  function isValidDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false;
    }

    const parsed = new Date(`${date}T00:00:00`);

    return (
      !isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === date
    );
  }

  // Validate time
  function isValidTime(time: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  }

  // Save profile
  async function save() {
    if (busy) return;

    setError("");

    // Check empty fields
    if (
      !values.full_name.trim() ||
      !values.date_of_birth.trim() ||
      !values.time_of_birth.trim() ||
      !values.birth_place.trim() ||
      !values.current_location.trim()
    ) {
      setError(
        "Please complete all fields to personalize your Panchangam."
      );
      return;
    }

    // Validate date
    if (!isValidDate(values.date_of_birth.trim())) {
      setError("Please enter a valid date in YYYY-MM-DD format.");
      return;
    }

    // Validate time
    if (!isValidTime(values.time_of_birth.trim())) {
      setError("Please enter a valid time, for example 06:30.");
      return;
    }

    setBusy(true);

    try {
      // Get authenticated session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      // Prepare profile data
      const profile = {
        id: session.user.id,
        email: session.user.email ?? null,

        full_name: values.full_name.trim(),

        date_of_birth: values.date_of_birth.trim(),

        time_of_birth: values.time_of_birth.trim(),

        birth_place: values.birth_place.trim(),

        current_location: values.current_location.trim(),

        preferred_language: values.preferred_language,

        panchangam_tradition: "Telugu Drik",

        onboarding_complete: true,
      };

      console.log("KAALAM: Saving profile...");

      // Save to Supabase
      const { error: saveError } = await supabase
        .from("profiles")
        .upsert(profile, {
          onConflict: "id",
        });

      if (saveError) {
        throw saveError;
      }

      console.log("KAALAM: Profile saved successfully.");

      Alert.alert(
        "Profile Saved",
        "Your KAALAM profile has been created successfully.",
        [
          {
            text: "Continue",
            onPress: () => onComplete(),
          },
        ]
      );

    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Could not save your profile.";

      console.error("KAALAM PROFILE SAVE ERROR:", e);

      setError(message);

      Alert.alert(
        "Profile Save Failed",
        message
      );

    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.brand}>KAALAM</Text>

      <Text style={styles.title}>
        Your details
      </Text>

      <Text style={styles.subtitle}>
        These details are used to personalize your horoscope
        and date recommendations.
      </Text>

      {/* Full Name */}
      <TextInput
        value={values.full_name}
        onChangeText={(v) => update("full_name", v)}
        placeholder="Full name"
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="words"
      />

      {/* Other Fields */}
      {fields.map((field) => (
        <View key={field.key}>
          <Text style={styles.label}>
            {field.label}
          </Text>

          <TextInput
            value={values[field.key]}
            onChangeText={(v) => update(field.key, v)}
            placeholder={field.placeholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            keyboardType={
              field.key === "date_of_birth" ||
              field.key === "time_of_birth"
                ? "numbers-and-punctuation"
                : "default"
            }
            autoCapitalize="words"
          />
        </View>
      ))}

      {/* Language */}
      <Text style={styles.label}>
        Preferred language
      </Text>

      <View style={styles.pills}>
        {["Telugu", "English", "Hindi"].map((language) => {
          const selected =
            values.preferred_language === language;

          return (
            <TouchableOpacity
              key={language}
              onPress={() =>
                update("preferred_language", language)
              }
              style={[
                styles.pill,
                selected && styles.pillSelected,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  selected && styles.pillTextSelected,
                ]}
              >
                {language}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Panchangam Tradition */}
      <Text style={styles.label}>
        Panchangam tradition
      </Text>

      <View style={styles.pills}>
        <View
          style={[
            styles.pill,
            styles.pillSelected,
          ]}
        >
          <Text
            style={[
              styles.pillText,
              styles.pillTextSelected,
            ]}
          >
            Telugu Drik
          </Text>
        </View>
      </View>

      {/* Error */}
      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}

      {/* Save Button */}
      <TouchableOpacity
        disabled={busy}
        onPress={save}
        activeOpacity={0.8}
        style={[
          styles.button,
          busy && styles.buttonDisabled,
        ]}
      >
        {busy ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#FFFFFF" />

            <Text style={styles.buttonText}>
              Saving...
            </Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>
            Save and Continue
          </Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },

  content: {
    padding: 25,
    paddingBottom: 45,
  },

  brand: {
    color: colors.maroon,
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: 5,
    marginTop: 20,
    marginBottom: 35,
  },

  title: {
    color: colors.maroonDark,
    fontSize: 30,
    fontWeight: "600",
    fontFamily: "Georgia",
  },

  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 24,
  },

  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 7,
    marginTop: 5,
  },

  input: {
    backgroundColor: "rgba(255, 248, 234, 0.96)",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 13,
    marginBottom: 13,
  },

  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  pill: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255, 248, 234, 0.96)",
  },

  pillSelected: {
    backgroundColor: "#71370F",
    borderColor: colors.maroon,
  },

  pillText: {
    color: colors.text,
    fontSize: 12,
  },

  pillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  button: {
    backgroundColor: "#71370F",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 54,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  error: {
    color: colors.maroon,
    fontSize: 12,
    marginBottom: 10,
  },
});
