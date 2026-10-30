import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase, supabaseConfigured } from "../auth/supabase";
import { colors } from "../theme/colors";

export function AuthScreen() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!supabaseConfigured) {
      setMessage("Supabase is not configured. Add the Supabase URL and anon key to the app environment.");
      return;
    }
    if (!email.trim() || !password) {
      setMessage("Enter your email address and password.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setMessage("Enter your name.");
      return;
    }
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          setMessage("Your account is created.");
        } else {
          setMessage("Check your email and confirm your address to activate your KAALAM account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to complete authentication.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <Image source={require("../../assets/kaalam-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{mode === "signup" ? "Create your account" : "Welcome back"}</Text>
        <Text style={styles.subtitle}>{mode === "signup" ? "Your personal Panchangam starts here." : "Sign in to continue."}</Text>

        {mode === "signup" ? (
          <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} autoCapitalize="words" style={styles.input} />
        ) : null}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password (minimum 8 characters)" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <TouchableOpacity disabled={busy} onPress={submit} style={[styles.button, busy && styles.disabled]}>
          <Text style={styles.buttonText}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>
          <Text style={styles.switchText}>{mode === "signup" ? "Already registered? Sign in" : "New to KAALAM? Create an account"}</Text>
        </TouchableOpacity>
        <Text style={styles.terms}>By continuing, you agree to use KAALAM's astrology information as traditional guidance, not guaranteed predictions.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent", justifyContent: "center" },
  inner: { paddingHorizontal: 26, paddingVertical: 30 },
  logo: { width: 190, height: 150, alignSelf: "flex-start", marginBottom: 24 },
  title: { color: colors.maroonDark, fontSize: 30, fontWeight: "600", fontFamily: "Georgia" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 8, marginBottom: 30 },
  input: { backgroundColor: "rgba(255, 248, 234, 0.96)", borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15, color: colors.text, fontSize: 14, marginBottom: 12 },
  button: { backgroundColor: "#71370F", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  switchText: { color: colors.maroon, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 22 },
  message: { color: colors.maroon, fontSize: 12, lineHeight: 18, marginVertical: 8 },
  terms: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 30 },
});
