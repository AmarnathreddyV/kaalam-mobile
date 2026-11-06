import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase, supabaseConfigured } from "../auth/supabase";
import { colors } from "../theme/colors";

const TEST_OTP = "123456";
const TEST_OTP_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_KAALAM_TEST_OTP_ENABLED === "true";

export function AuthScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  function showMessage(value: string, isError = false) {
    setMessage(value);
    setMessageIsError(isError);
  }

  function normalizeIndianPhone(value: string) {
    const digits = value.replace(/\D/g, "");
    const national = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    if (!/^[6-9]\d{9}$/.test(national)) return "";
    return `+91${national}`;
  }

  async function sendOtp(isResend = false) {
    if (busy || (isResend && resendSeconds > 0)) return;
    if (!supabaseConfigured) return showMessage("Phone sign-in is not configured. Please try again later.", true);
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      return showMessage("Enter a valid 10-digit Indian mobile number beginning with 6, 7, 8 or 9.", true);
    }

    setBusy(true);
    setMessage("");
    try {
      if (TEST_OTP_ENABLED) {
        setVerifiedPhone(normalized);
        setOtpSent(true);
        setOtp("");
        setResendSeconds(0);
        showMessage("Temporary test mode: enter 123456. No SMS will be sent.");
        return;
      }
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
      setResendSeconds(60);
      showMessage(`A verification code has been sent to ${normalized}.`);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "Unable to send the verification code. Please try again later.", true);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (busy) return;
    if (!/^\d{6}$/.test(otp.trim())) return showMessage("Enter the 6-digit verification code.", true);
    setBusy(true);
    setMessage("");
    try {
      if (TEST_OTP_ENABLED) {
        if (otp.trim() !== TEST_OTP) throw new Error("Incorrect test code. Enter 123456.");
        const { error } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              full_name: name.trim(),
              phone_number: verifiedPhone,
              kaalam_test_otp: true,
            },
          },
        });
        if (error) throw error;
        // App.tsx observes the Supabase auth event and loads the user's profile.
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: otp.trim(),
        type: "sms",
      });
      if (error) throw error;
      // App.tsx observes the Supabase auth event and loads the user's profile.
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
          {otpSent ? (TEST_OTP_ENABLED ? `Enter the temporary test code for ${verifiedPhone}.` : `Enter the 6-digit code sent to ${verifiedPhone}.`) : "Create your KAALAM account or sign in securely using your Indian mobile number."}
        </Text>

        {!otpSent ? (
          <>
            <TextInput value={name} onChangeText={setName} placeholder="Your name (optional)"
              placeholderTextColor={colors.muted} autoCapitalize="words" style={styles.input} />
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}><Text style={styles.countryCodeText}>🇮🇳  +91</Text></View>
              <TextInput value={phone} onChangeText={value => setPhone(value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number" placeholderTextColor={colors.muted}
                keyboardType="number-pad" autoComplete="tel-national" textContentType="telephoneNumber"
                maxLength={10} style={[styles.input, styles.phoneInput]} />
            </View>
            <TouchableOpacity disabled={busy} onPress={() => sendOtp(false)} style={[styles.button, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{TEST_OTP_ENABLED ? "Continue with test OTP" : "Send OTP"}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput value={otp} onChangeText={value => setOtp(value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit OTP" placeholderTextColor={colors.muted} keyboardType="number-pad"
              textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6}
              style={[styles.input, styles.otpInput]} />
            <TouchableOpacity disabled={busy} onPress={verifyOtp} style={[styles.button, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
            </TouchableOpacity>
            {!TEST_OTP_ENABLED && (
              <TouchableOpacity disabled={busy || resendSeconds > 0} onPress={() => sendOtp(true)} style={styles.textButton}>
                <Text style={[styles.link, (busy || resendSeconds > 0) && styles.linkDisabled]}>
                  {resendSeconds > 0 ? `Resend OTP in 00:${String(resendSeconds).padStart(2, "0")}` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity disabled={busy} onPress={() => { setOtpSent(false); setOtp(""); setMessage(""); setResendSeconds(0); }}>
              <Text style={styles.switchText}>Change phone number</Text>
            </TouchableOpacity>
          </>
        )}

        {!!message && <Text accessibilityRole="alert" style={[styles.message, messageIsError && styles.messageError]}>{message}</Text>}
        <Text style={styles.terms}>By continuing, you agree to use KAALAM's traditional Panchangam guidance responsibly.</Text>
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
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  countryCode: { backgroundColor: "rgba(255, 248, 234, 0.96)", borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 52, justifyContent: "center", marginBottom: 12 },
  countryCodeText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  phoneInput: { flex: 1, marginBottom: 12 },
  otpInput: { textAlign: "center", fontSize: 23, letterSpacing: 9, fontWeight: "700" },
  button: { backgroundColor: "#71370F", padding: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 52, marginTop: 7 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  textButton: { alignItems: "center", paddingTop: 17 },
  link: { color: colors.maroon, fontSize: 13, fontWeight: "700" },
  linkDisabled: { opacity: 0.5 },
  switchText: { color: colors.maroon, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 17 },
  message: { color: "#27633A", fontSize: 12, lineHeight: 18, marginTop: 15, textAlign: "center" },
  messageError: { color: "#9B2525" },
  terms: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 25 },
});
