import React, { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase, supabaseConfigured } from "../auth/supabase";
import { colors } from "../theme/colors";

type AuthScreenProps = { recoveryMode?: boolean; onRecoveryComplete?: () => void };

export function AuthScreen(_props: AuthScreenProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  function showMessage(value: string, isError = false) {
    setMessage(value);
    setMessageIsError(isError);
  }

  function normalizePhone(value: string) {
    const trimmed = value.trim().replace(/[\\s()-]/g, "");
    if (trimmed.startsWith("+")) return trimmed;
    const digits = trimmed.replace(/\\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    return "";
  }

  async function sendOtp() {
    if (busy) return;
    if (!supabaseConfigured) return showMessage("Phone sign-in is not configured. Please try again later.", true);
    const normalized = normalizePhone(phone);
    if (!normalized || !/^\\+[1-9]\\d{7,14}$/.test(normalized)) {
      return showMessage("Enter a valid phone number with country code. For India, enter your 10-digit mobile number.", true);
    }

    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: {
          shouldCreateUser: true,
          ...(name.trim() ? { data: { full_name: name.trim() } } : {}),
        },
      });
      if (error) throw error;
      setVerifiedPhone(normalized);
      setOtpSent(true);
      setOtp("");
      showMessage(`A verification code has been sent to ${normalized}.`);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "Unable to send the verification code.", true);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (busy) return;
    if (!/^\\d{6}$/.test(otp.trim())) return showMessage("Enter the 6-digit verification code.", true);
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: otp.trim(),
        type: "sms",
      });
      if (error) throw error;
      // Supabase auth state listener in App.tsx handles the new session.
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "The verification code could not be verified.", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <Image source={require("../../assets/kaalam-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{otpSent ? "Verify your number" : "Continue with phone"}</Text>
        <Text style={styles.subtitle}>
          {otpSent ? `Enter the 6-digit code sent to ${verifiedPhone}.` : "Sign in or create your KAALAM account securely using a one-time password."}
        </Text>

        {!otpSent ? (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name (optional)"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              style={styles.input}
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Mobile number (e.g. 9876543210)"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              style={styles.input}
            />
            <TouchableOpacity disabled={busy} onPress={sendOtp} style={[styles.button, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              value={otp}
              onChangeText={value => setOtp(value.replace(/\\D/g, "").slice(0, 6))}
              placeholder="6-digit OTP"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              style={[styles.input, styles.otpInput]}
            />
            <TouchableOpacity disabled={busy} onPress={verifyOtp} style={[styles.button, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
            </TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={sendOtp} style={styles.textButton}>
              <Text style={styles.link}>Resend OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={() => { setOtpSent(false); setOtp(""); setMessage(""); }}>
              <Text style={styles.switchText}>Change phone number</Text>
            </TouchableOpacity>
          </>
        )}

        {!!message && <Text accessibilityRole="alert" style={[styles.message, messageIsError && styles.messageError]}>{message}</Text>}
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
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 24 },
  input: { backgroundColor: "rgba(255, 248, 234, 0.96)", borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15, color: colors.text, fontSize: 15, marginBottom: 12 },
  otpInput: { textAlign: "center", fontSize: 23, letterSpacing: 9, fontWeight: "700" },
  button: { backgroundColor: "#71370F", padding: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 52, marginTop: 7 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  textButton: { alignItems: "center", paddingTop: 17 },
  link: { color: colors.maroon, fontSize: 13, fontWeight: "700" },
  switchText: { color: colors.maroon, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 17 },
  message: { color: "#27633A", fontSize: 12, lineHeight: 18, marginTop: 15, textAlign: "center" },
  messageError: { color: "#9B2525" },
  terms: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 25 },
});
