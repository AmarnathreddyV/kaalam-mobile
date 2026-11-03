import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase, supabaseConfigured } from "../auth/supabase";
import { colors } from "../theme/colors";

const AUTH_REDIRECT = "kaalam://auth/callback";

type AuthMode = "signup" | "login" | "forgot" | "reset";

export function AuthScreen({ recoveryMode = false, onRecoveryComplete }: { recoveryMode?: boolean; onRecoveryComplete?: () => void }) {
  const [mode, setMode] = useState<AuthMode>(recoveryMode ? "reset" : "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => { if (recoveryMode) setMode("reset"); }, [recoveryMode]);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !url.startsWith("kaalam://auth/")) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const hash = parsed.hash.replace(/^#/, "");
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          }
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Unable to complete the secure sign-in link.");
        setMessageIsError(true);
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => { void handleUrl(url); });
    return () => subscription.remove();
  }, []);

  function showMessage(value: string, isError = false) {
    setMessage(value);
    setMessageIsError(isError);
  }

  async function submit() {
    if (busy) return;
    if (!supabaseConfigured) return showMessage("Supabase is not configured. Add the Supabase URL and anon key to the app environment.", true);
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "forgot") {
      if (!cleanEmail) return showMessage("Enter the email address linked to your KAALAM account.", true);
    } else if (mode !== "reset" && !cleanEmail) {
      return showMessage("Enter your email address.", true);
    }
    if (mode === "signup" && !name.trim()) return showMessage("Enter your full name.", true);
    if (mode === "signup" || mode === "login" || mode === "reset") {
      if (password.length < 8) return showMessage("Use a password with at least 8 characters.", true);
    }
    if ((mode === "signup" || mode === "reset") && password !== confirmPassword) {
      return showMessage("The passwords do not match.", true);
    }

    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: AUTH_REDIRECT },
        });
        if (error) throw error;
        showMessage(data.session ? "Your account is created. Continue to set up your profile." : "Account created. Check your inbox and confirm your email before signing in.");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: AUTH_REDIRECT });
        if (error) throw error;
        showMessage("If an account exists for this address, a password-reset link will arrive by email. Check your spam folder too.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        onRecoveryComplete?.();
        showMessage("Password updated. Sign in using your new password.");
      }
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "Unable to complete authentication.", true);
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    if (busy) return;
    if (!supabaseConfigured) return showMessage("Supabase is not configured.", true);
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error("Google sign-in URL was not returned.");
      await Linking.openURL(data.url);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "Google sign-in could not be started.", true);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signup" ? "Create your account" : mode === "login" ? "Welcome back" : mode === "forgot" ? "Reset your password" : "Choose a new password";
  const subtitle = mode === "signup" ? "Your personal Panchangam starts here." : mode === "login" ? "Sign in to continue to KAALAM." : mode === "forgot" ? "We'll email you a secure password-reset link." : "Use a strong password you haven't used before.";

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <Image source={require("../../assets/kaalam-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {mode === "signup" && <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} autoCapitalize="words" style={styles.input} />}
        {mode !== "reset" && <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" style={styles.input} />}
        {mode !== "forgot" && <TextInput value={password} onChangeText={setPassword} placeholder={mode === "reset" ? "New password (minimum 8 characters)" : "Password (minimum 8 characters)"} placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoComplete={mode === "login" ? "current-password" : "new-password"} style={styles.input} />}
        {(mode === "signup" || mode === "reset") && <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoComplete="new-password" style={styles.input} />}

        {!!message && <Text accessibilityRole="alert" style={[styles.message, messageIsError && styles.messageError]}>{message}</Text>}

        <TouchableOpacity disabled={busy} onPress={submit} style={[styles.button, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{mode === "signup" ? "Create account" : mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Update password"}</Text>}
        </TouchableOpacity>

        {mode === "signup" || mode === "login" ? (
          <>
            <View style={styles.separator}><View style={styles.rule} /><Text style={styles.orText}>OR</Text><View style={styles.rule} /></View>
            <TouchableOpacity disabled={busy} onPress={googleSignIn} style={[styles.googleButton, busy && styles.disabled]}>
              <Text style={styles.googleText}>G  Continue with Google</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {mode === "login" && <TouchableOpacity onPress={() => { setMode("forgot"); showMessage(""); }}><Text style={styles.link}>Forgot password?</Text></TouchableOpacity>}
        <TouchableOpacity onPress={() => { setMode(mode === "signup" ? "login" : "signup"); showMessage(""); setPassword(""); setConfirmPassword(""); }}>
          {mode === "signup" || mode === "login" ? <Text style={styles.switchText}>{mode === "signup" ? "Already registered? Sign in" : "New to KAALAM? Create an account"}</Text> : <Text style={styles.switchText}>Back to sign in</Text>}
        </TouchableOpacity>
        <Text style={styles.terms}>By continuing, you agree to use KAALAM's astrology information as traditional guidance, not guaranteed predictions.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent", justifyContent: "center" },
  inner: { paddingHorizontal: 26, paddingVertical: 24 },
  logo: { width: 170, height: 125, alignSelf: "flex-start", marginBottom: 16 },
  title: { color: colors.maroonDark, fontSize: 29, fontWeight: "600", fontFamily: "Georgia" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 8, marginBottom: 24 },
  input: { backgroundColor: "rgba(255, 248, 234, 0.96)", borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, color: colors.text, fontSize: 14, marginBottom: 11 },
  button: { backgroundColor: "#71370F", padding: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 52, marginTop: 7 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  googleButton: { borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(255, 248, 234, 0.96)", padding: 15, borderRadius: 12, alignItems: "center" },
  googleText: { color: colors.text, fontWeight: "700", fontSize: 14 },
  separator: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 17 },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  orText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  switchText: { color: colors.maroon, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 20 },
  link: { color: colors.maroon, fontSize: 12, fontWeight: "600", textAlign: "right", marginTop: 14 },
  message: { color: "#27633A", fontSize: 12, lineHeight: 18, marginVertical: 9 },
  messageError: { color: "#9B2525" },
  terms: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 22 },
});
