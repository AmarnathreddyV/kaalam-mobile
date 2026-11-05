import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Modal, TextInput, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Screen, SectionTitle, Panel, LabelValue } from "../components/Screen";
import { colors } from "../theme/colors";
import { fetchDailyPanchangam, DailyPanchangamResponse } from "../services/panchangam";
import { supabase } from "../auth/supabase";
import { useLanguage } from "../i18n";

type Profile = {
  full_name?: string | null;
  date_of_birth?: string | null;
  time_of_birth?: string | null;
  birth_place?: string | null;
  current_location?: string | null;
  preferred_language?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  current_timezone?: string | null;
  birth_chart_summary?: { rashi?: string; nakshatra?: string; pada?: number; lagna?: string } | null;
};

function displayBirthDate(value?: string) {
  if (!value) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function todayLabel(language: string) {
  const localeMap: Record<string, string> = { Telugu: "te-IN", Hindi: "hi-IN", Tamil: "ta-IN", Malayalam: "ml-IN", Kannada: "kn-IN", Gujarati: "gu-IN", Marathi: "mr-IN", English: "en-IN" };
  const locale = localeMap[language] || "en-IN";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(new Date()).toUpperCase().replace(",", " ·");
}

export function HomeScreen({ onOpenPoojaItems }: { onOpenPoojaItems: () => void }) {
  const { t, language } = useLanguage();
  const [result, setResult] = useState<DailyPanchangamResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [loading, setLoading] = useState(true);
  const songPlayer = useAudioPlayer(null);
  const songStatus = useAudioPlayerStatus(songPlayer);
  const [songStarted, setSongStarted] = useState(false);
  const [activeLocation, setActiveLocation] = useState<{ latitude: number; longitude: number; timezone: string } | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationModal, setLocationModal] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);

  const applyLocation = useCallback(async (location: { latitude: number; longitude: number; timezone: string; display_name: string }) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Please reopen KAALAM and try again.");
    const update = {
      current_location: location.display_name,
      current_latitude: location.latitude,
      current_longitude: location.longitude,
      current_timezone: location.timezone,
    };
    const { error: saveError } = await supabase.from("profiles").update(update).eq("id", auth.user.id);
    if (saveError) throw saveError;
    setActiveLocation({ latitude: location.latitude, longitude: location.longitude, timezone: location.timezone });
    setLocationLabel(location.display_name);
    setProfile(current => ({ ...(current || {}), ...update }));
    setLoading(true);
    setError("");
    try {
      setResult(await fetchDailyPanchangam(new Date(), { latitude: location.latitude, longitude: location.longitude, timezone: location.timezone }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh Panchangam for this location.");
    } finally {
      setLoading(false);
    }
  }, []);

  const useDeviceLocation = useCallback(async (requestPermission = true) => {
    setLocationBusy(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted" && requestPermission) permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Location permission was not granted. Choose a city manually instead.");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [address] = await Location.reverseGeocodeAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude }).catch(() => []);
      const parts = [address?.city || address?.district || address?.subregion, address?.region, address?.country].filter(Boolean);
      const display_name = parts.join(", ") || `${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}`;
      const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://kaalam-mobile.onrender.com").replace(/\/$/, "");
      let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      if (display_name) {
        try {
          const resolvedResponse = await fetch(`${apiBase}/api/location/resolve`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ place: display_name }),
          });
          const resolved = await resolvedResponse.json();
          if (resolvedResponse.ok && typeof resolved.timezone === "string") timezone = resolved.timezone;
        } catch { /* Keep the device timezone as a fallback. */ }
      }
      await applyLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, timezone, display_name });
      setLocationModal(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to read device location.";
      setError(message);
      setLocationModal(true);
    } finally {
      setLocationBusy(false);
    }
  }, [applyLocation]);

  const saveManualLocation = useCallback(async () => {
    if (!manualLocation.trim() || locationBusy) return;
    setLocationBusy(true);
    try {
      const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://kaalam-mobile.onrender.com").replace(/\/$/, "");
      const response = await fetch(`${apiBase}/api/location/resolve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: manualLocation.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.detail || "Could not find that location. Include city, state and country.");
      await applyLocation({ latitude: body.latitude, longitude: body.longitude, timezone: body.timezone, display_name: body.display_name });
      setManualLocation("");
      setLocationModal(false);
    } catch (e) {
      Alert.alert("Location not found", e instanceof Error ? e.message : "Please try another city name.");
    } finally {
      setLocationBusy(false);
    }
  }, [manualLocation, locationBusy, applyLocation]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: auth }, { data: profileData, error: pError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles")
          .select("full_name,date_of_birth,time_of_birth,birth_place,current_location,preferred_language,current_latitude,current_longitude,current_timezone,birth_chart_summary")
          .maybeSingle(),
      ]);
      if (pError) setProfileError(pError.message);
      else setProfile(profileData as Profile | null);

      const userName = auth.user?.user_metadata?.full_name;
      if (!profileData && typeof userName === "string") {
        setProfile({ full_name: userName });
      }
      if (profileData?.current_latitude == null || profileData?.current_longitude == null || !profileData?.current_timezone) {
        throw new Error("Your current location has not been resolved yet. Please update your profile details.");
      }
      const savedLocation = { latitude: profileData.current_latitude, longitude: profileData.current_longitude, timezone: profileData.current_timezone };
      setActiveLocation(savedLocation);
      setLocationLabel(profileData.current_location || "Saved location");
      setResult(await fetchDailyPanchangam(new Date(), savedLocation));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load today's Panchangam.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep the saved city as the source of truth. Device GPS is used only
  // after the user explicitly selects "Use my current location" in the picker.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    return () => { songPlayer.pause(); };
  }, [songPlayer]);

  const p = result?.data?.panchang;
  const translatePanchang = (value?: string) => {
    if (!value?.trim()) return "—";
    const normalized = value.trim();
    const exactTranslation = t(normalized);
    if (exactTranslation !== normalized) return exactTranslation;
    return normalized
      .split(/(\s+|[·,\/-])/)
      .map(part => /^[\s·,\/-]+$/.test(part) ? part : t(part))
      .join("");
  };
  const tithi = [p?.tithi?.name, p?.tithi?.paksha].filter(Boolean).map(translatePanchang).join(" · ") || "—";
  const nakshatra = translatePanchang(p?.nakshatra?.name);
  const yoga = translatePanchang(p?.yoga?.name);
  const karana = translatePanchang(p?.karana?.name);
  const name = profile?.full_name?.trim() || "there";
  const daily = result?.data;
  const userTimezone = profile?.current_timezone || "UTC";
  const localeMap: Record<string, string> = { Telugu: "te-IN", Hindi: "hi-IN", Tamil: "ta-IN", Malayalam: "ml-IN", Kannada: "kn-IN", Gujarati: "gu-IN", Marathi: "mr-IN", English: "en-IN" };
  const timeLocale = localeMap[language] || "en-IN";
  const timeText = (value?: string) => {
    if (!value) return "Unavailable";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unavailable";
    return new Intl.DateTimeFormat(timeLocale, {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: userTimezone,
    }).format(parsed);
  };
  const timeRange = (period?: { start?: string; end?: string }) =>
    period?.start && period?.end ? `${timeText(period.start)} – ${timeText(period.end)}` : "Unavailable";
  const sunrise = daily?.sun_times?.rise?.local_datetime;
  const sunset = daily?.sun_times?.set?.local_datetime;
  const choghadiyaGood = (daily?.choghadiya?.day || []).filter(x =>
    ["Amrit", "Shubh", "Labh", "Char"].includes(x.name || "")
  );
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const todaySong: Record<string, { title: string; deity: string; source: any }> = {
    Sunday: { title: "Surya Devotional Prayer", deity: "Lord Surya", source: require("../../assets/audios/surya dev.mp3") },
    Monday: { title: "Lingashtakam", deity: "Lord Shiva", source: require("../../devotional-song/lingashtakam_lord_shiva.mp3") },
    Tuesday: { title: "Hanuman Chalisa", deity: "Lord Hanuman", source: require("../../devotional-song/hanuman_chalisa.mp3") },
    Wednesday: { title: "Ganpati Stotram", deity: "Lord Ganesha", source: require("../../devotional-song/ganpati_stotram.mp3") },
    Thursday: { title: "Garuda Gamana Tava", deity: "Lord Maha Vishnu", source: require("../../devotional-song/garuda_gamana_tava_sri_maha_vishnu_stotram.mp3") },
    Friday: { title: "Lakshmi Devotional Prayer", deity: "Goddess Lakshmi", source: require("../../assets/audios/lakshmi devi.mp3") },
    Saturday: { title: "Sri Venkatesha Suprabhatam", deity: "Lord Venkateswara", source: require("../../devotional-song/sri_venkatesha_suprabhatam.mp3") },
  };
  const song = todaySong[weekday] || todaySong.Monday;
  const toggleTodaySong = () => {
    if (songStarted) {
      if (songStatus.playing) songPlayer.pause();
      else songPlayer.play();
      return;
    }
    setSongStarted(true);
    try {
      songPlayer.replace(song.source);
      songPlayer.play();
    } catch (playError) {
      console.error("KAALAM today's song playback failed:", playError);
    }
  };
  const weekdayGuidance: Record<string, { deity: string; temple: string; practice: string }> = {
    Sunday: { deity: "Lord Surya · Sunday", temple: "If convenient, visit a Surya or Shiva temple.", practice: "Offer a simple morning prayer to the Sun and begin the day with gratitude." },
    Monday: { deity: "Lord Shiva · Monday", temple: "If convenient, visit a Shiva temple.", practice: "Offer prayers to Lord Shiva; a quiet moment of meditation is also suitable." },
    Tuesday: { deity: "Lord Hanuman · Tuesday", temple: "If convenient, visit a Hanuman temple.", practice: "Recite Hanuman Chalisa or offer a simple prayer for courage and steadiness." },
    Wednesday: { deity: "Lord Ganesha · Wednesday", temple: "If convenient, visit a Ganesha temple.", practice: "Begin an important task with a prayer to Lord Ganesha." },
    Thursday: { deity: "Lord Vishnu · Thursday", temple: "If convenient, visit a Vishnu or Venkateswara temple.", practice: "Read or listen to a short Vishnu prayer and practise generosity." },
    Friday: { deity: "Goddess Lakshmi · Friday", temple: "If convenient, visit a Lakshmi or Devi temple.", practice: "Offer a simple prayer to Goddess Lakshmi and keep your home welcoming." },
    Saturday: { deity: "Lord Venkateswara or Hanuman · Saturday", temple: "If convenient, visit a Venkateswara or Hanuman temple.", practice: "Offer a prayer for patience, humility and service to others." },
  };
  const tithiText = [p?.tithi?.name, p?.tithi?.paksha].filter(Boolean).join(" ").toLowerCase();
  const specialTithiNote = tithiText.includes("ekadashi")
    ? t("Ekadashi is traditionally observed by many devotees with Vishnu worship. Fasting practices differ; follow your health needs and family tradition.")
    : tithiText.includes("purnima") || tithiText.includes("pournami")
      ? t("Pournami (full-moon day) is traditionally observed with prayer and devotional practices in many households.")
      : tithiText.includes("amavasya")
        ? t("Amavasya is traditionally associated in many families with remembrance and prayers for ancestors; customs vary.")
        : "";
  const spiritualGuidance = {
    ...(weekdayGuidance[weekday] || weekdayGuidance.Monday),
    tithiNote: specialTithiNote,
  };
  const basicDetails = useMemo(() => [
    ["Rashi", profile?.birth_chart_summary?.rashi || "Not calculated"],
    ["Janma Nakshatra", profile?.birth_chart_summary?.nakshatra || "Not calculated"],
    ["Birth date", displayBirthDate(profile?.date_of_birth ?? undefined) || "Not provided"],
    ["Birth place", profile?.birth_place || "Not provided"],
  ], [profile]);

  return (
    <Screen>
      <TouchableOpacity style={styles.locationPill} onPress={() => { setManualLocation(locationLabel); setLocationModal(true); }} activeOpacity={0.8}>
        <Text style={styles.locationPillText}>⌖  {locationLabel || t("Choose your location")}  ▾</Text>
      </TouchableOpacity>
      <Text style={styles.date}>{todayLabel(language)}</Text>
      <Text style={styles.greeting}>{t("Namaskaram")}, {name}</Text>
      <Text style={styles.name}>{t("Your day, in alignment.")}</Text>

      <SectionTitle>{t("YOUR ASTROLOGY PROFILE")}</SectionTitle>
      <Panel>
        {basicDetails.map(([label, value], index) => (
          <LabelValue key={label} label={t(label)} value={t(value)} last={index === basicDetails.length - 1} />
        ))}
        {!!profileError && <Text style={styles.smallNote}>{t("Profile details could not be loaded:")} {t(profileError)}</Text>}
        <Text style={styles.smallNote}>{t("Birth-chart details are shown from the calculation saved to your profile. If your birth details change, update them and recalculate your chart.")}</Text>
      </Panel>

      <SectionTitle>{t("THIS DAY'S PANCHANGAM")}</SectionTitle>
      <Panel>
        {loading ? (
          <View style={styles.state}><ActivityIndicator color={colors.maroon} /><Text style={styles.stateText}>{t("Loading today's Panchangam…")}</Text></View>
        ) : error ? (
          <View>
            <Text style={styles.error}>{t(error)}</Text>
            <TouchableOpacity onPress={load}><Text style={styles.retry}>{t("Try again")}</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.panchangamGrid}>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>{t("TITHI")}</Text><Text style={styles.gridValue}>{tithi}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>{t("NAKSHATRA")}</Text><Text style={styles.gridValue}>{nakshatra}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>{t("YOGA")}</Text><Text style={styles.gridValue}>{yoga}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>{t("KARANA")}</Text><Text style={styles.gridValue}>{karana}</Text></View>
            </View>
            <Text style={styles.smallNote}>{t("Local Panchangam snapshot")} · {result?.date || ""}</Text>
          </>
        )}
      </Panel>


      <SectionTitle>{t("FAVOURABLE TIMINGS")}</SectionTitle>
      <Panel>
        {loading ? <Text style={styles.horoscope}>{t("Loading favourable periods…")}</Text> : (
          <>
            {choghadiyaGood.map((slot,index)=>(<LabelValue key={String(slot.name)+index} label={t(slot.name || "Choghadiya")} value={timeRange(slot)} />))}
            <LabelValue label={t("Abhijit Muhurat")} value={timeRange(daily?.abhijit_muhurat?.interval?.period?.[0])} last />
            {!choghadiyaGood.length && <Text style={styles.smallNote}>{t("No favourable Choghadiya windows were returned for today.")}</Text>}
          </>
        )}
        <Text style={styles.smallNote}>{t("General daily indicators only; these do not certify a ceremony-specific Muhurtham.")}</Text>
      </Panel>

      <SectionTitle>{t("INAUSPICIOUS TIMINGS")}</SectionTitle>
      <Panel>
        <LabelValue label={t("Rahu Kalam")} value={timeRange(daily?.inauspicious_periods?.rahu_kaal)} />
        <LabelValue label={t("Yamagandam")} value={timeRange(daily?.inauspicious_periods?.yamaganda)} />
        <LabelValue label={t("Gulika Kalam")} value={timeRange(daily?.inauspicious_periods?.gulika_kaal)} last />
        <Text style={styles.smallNote}>{t("Traditional periods to be mindful of; interpretations and practices vary.")}</Text>
      </Panel>

      <SectionTitle>{t("TODAY'S SONG")}</SectionTitle>
      <Panel style={styles.todaySongPanel}>
        <View style={styles.todaySongIcon}><Text style={styles.todaySongMusic}>♫</Text></View>
        <View style={styles.todaySongInfo}>
          <Text style={styles.todaySongTitle}>{t(song.title)}</Text>
          <Text style={styles.todaySongDeity}>{t(song.deity)} · {t(weekday)}</Text>
          {songStatus.isBuffering && <Text style={styles.smallNote}>{t("Loading audio…")}</Text>}
          {!!songStatus.error && <Text style={styles.songError}>{String(songStatus.error)}</Text>}
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={songStatus.playing ? t("Pause today's song") : t("Play today's song")} style={styles.todaySongButton} onPress={toggleTodaySong}>
          <Text style={styles.todaySongButtonText}>{songStatus.playing ? "Ⅱ" : "▶"}</Text>
        </TouchableOpacity>
      </Panel>

      <SectionTitle>{t("TODAY'S SPIRITUAL GUIDANCE")}</SectionTitle>
      <Panel>
        {loading ? <View style={styles.state}><ActivityIndicator color={colors.maroon} /><Text style={styles.stateText}>Preparing today's spiritual guidance…</Text></View> : error ? <Text style={styles.horoscope}>{t("Spiritual guidance will appear when today's Panchangam is available.")}</Text> : (
          <>
            <Text style={styles.suggestionTitle}>{t(spiritualGuidance.deity)}</Text>
            <Text style={styles.guidanceLabel}>{t("TEMPLE SUGGESTION")}</Text><Text style={styles.horoscope}>{t(spiritualGuidance.temple)}</Text>
            <Text style={styles.guidanceLabel}>{t("PRAYER OR ACTIVITY")}</Text><Text style={styles.horoscope}>{t(spiritualGuidance.practice)}</Text>
            {!!spiritualGuidance.tithiNote && <><Text style={styles.guidanceLabel}>{t("PANCHANGAM NOTE")}</Text><Text style={styles.horoscope}>{t(spiritualGuidance.tithiNote)}</Text></>}
            <Text style={styles.guidanceLabel}>{t("A THOUGHT FOR TODAY")}</Text><Text style={styles.horoscope}>{t("Try to avoid harsh words and rushed decisions. Make space for patience, kindness and thoughtful action.")}</Text>
            <Text style={styles.smallNote}>{t("General spiritual inspiration based on common weekday devotional associations and returned Tithi. Traditions vary by family and region.")}</Text>
          </>
        )}
      </Panel>

      <SectionTitle>{`${t("SUNRISE & SUNSET")} · ${profile?.current_location?.toUpperCase() || t("YOUR LOCATION")}`}</SectionTitle>
      <Panel>
        <LabelValue label={t("Sunrise")} value={timeText(sunrise)} />
        <LabelValue label={t("Sunset")} value={timeText(sunset)} last />
        <Text style={styles.smallNote}>{t("Calculated for your saved location and local time zone.")}</Text>
        {!!result?.unavailable && Object.keys(result.unavailable).length > 0 && <Text style={styles.smallNote}>{t("Some timing categories could not be loaded:")} {Object.keys(result.unavailable).join(", ")}.</Text>}
      </Panel>

      <Text style={styles.note}>Panchangam data is provided by Navamsha using your saved location. General daily indicators are not a guarantee of personal outcomes and do not replace event-specific Telugu Drik Muhurtham analysis.</Text>

      <Modal visible={locationModal} transparent animationType="fade" onRequestClose={() => setLocationModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.locationModalCard}>
            <Text style={styles.locationModalTitle}>{t("Set Panchangam location")}</Text>
            <Text style={styles.locationModalBody}>{t("Daily timings are calculated for this location. Use your device location or enter a city manually.")}</Text>
            <Text style={styles.osmAttribution} onPress={() => { void Linking.openURL("https://www.openstreetmap.org/copyright"); }} accessibilityRole="link">© OpenStreetMap contributors</Text>
            <TouchableOpacity style={styles.locationAction} disabled={locationBusy} onPress={() => { void useDeviceLocation(true); }}>
              {locationBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.locationActionText}>{t("Use my current location")}</Text>}
            </TouchableOpacity>
            <Text style={styles.locationOr}>{t("OR ENTER A CITY")}</Text>
            <TextInput value={manualLocation} onChangeText={setManualLocation} placeholder={t("Hyderabad, Telangana, India")} placeholderTextColor={colors.muted} style={styles.locationInput} />
            <TouchableOpacity style={styles.locationSave} disabled={locationBusy} onPress={() => { void saveManualLocation(); }}>
              <Text style={styles.locationSaveText}>{locationBusy ? t("Updating…") : t("Save location")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLocationModal(false)} style={styles.locationCancel}><Text style={styles.locationCancelText}>{t("Cancel")}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.poojaShortcut} onPress={onOpenPoojaItems}>
        <View style={styles.poojaShortcutText}>
          <Text style={styles.poojaShortcutTitle}>{t("Pooja Items & Samagri")}</Text>
          <Text style={styles.poojaShortcutSubtitle}>{t("View occasion-wise preparation lists")}</Text>
        </View>
        <Text style={styles.poojaShortcutArrow}>{t("VIEW  →")}</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  locationPill: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 18, backgroundColor: "rgba(169,133,69,0.12)", borderWidth: 1, borderColor: "rgba(169,133,69,0.35)" },
  locationPillText: { color: colors.maroonDark, fontSize: 11, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(25,15,12,0.52)", justifyContent: "center", padding: 22 },
  locationModalCard: { backgroundColor: "#FAF7EF", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.gold },
  locationModalTitle: { color: colors.maroonDark, fontFamily: "Georgia", fontSize: 21, fontWeight: "700" },
  locationModalBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 16 },
  osmAttribution: { color: colors.muted, fontSize: 10, textDecorationLine: "underline", marginTop: -8, marginBottom: 14 },
  locationAction: { minHeight: 46, borderRadius: 10, backgroundColor: colors.maroonDark, alignItems: "center", justifyContent: "center" },
  locationActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  locationOr: { color: colors.muted, fontSize: 9, letterSpacing: 1.3, textAlign: "center", marginVertical: 14 },
  locationInput: { borderWidth: 1, borderColor: colors.line, borderRadius: 9, padding: 12, color: colors.text, fontSize: 13 },
  locationSave: { backgroundColor: "rgba(169,133,69,0.18)", borderRadius: 9, padding: 13, alignItems: "center", marginTop: 10 },
  locationSaveText: { color: colors.maroonDark, fontSize: 13, fontWeight: "700" },
  locationCancel: { alignItems: "center", padding: 10, marginTop: 3 },
  locationCancelText: { color: colors.muted, fontSize: 12 },
  poojaShortcut: { marginTop: 18, marginBottom: 8, padding: 16, borderRadius: 10, backgroundColor: "#3B1019", borderWidth: 1, borderColor: "rgba(169,133,69,0.55)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  poojaShortcutText: { flex: 1 },
  poojaShortcutTitle: { color: "#FFF7E9", fontSize: 16, fontWeight: "600", letterSpacing: 0.15 },
  poojaShortcutSubtitle: { color: "#F0D8B8", fontSize: 11, marginTop: 6, letterSpacing: 0.15 },
  poojaShortcutArrow: { color: "#F7D99F", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginLeft: 8 },
  todaySongPanel: { flexDirection: "row", alignItems: "center", gap: 12 },
  todaySongIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(169,133,69,0.14)", alignItems: "center", justifyContent: "center" },
  todaySongMusic: { color: colors.maroon, fontSize: 24 },
  todaySongInfo: { flex: 1 },
  todaySongTitle: { color: colors.maroonDark, fontSize: 14, fontWeight: "700" },
  todaySongDeity: { color: colors.muted, fontSize: 11, marginTop: 4 },
  todaySongButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.maroonDark, alignItems: "center", justifyContent: "center" },
  todaySongButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  songError: { color: "#B00020", fontSize: 10, marginTop: 4 },
  date: { color: colors.gold, fontSize: 10, letterSpacing: 2.0, fontWeight: "700", marginTop: 12 },
  greeting: { color: colors.maroonDark, fontSize: 34, fontWeight: "500", fontFamily: "Georgia", letterSpacing: -0.7, marginTop: 16 },
  name: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  panchangamGrid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%", paddingVertical: 15 },
  gridLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.6, marginBottom: 8 },
  gridValue: { color: colors.text, fontSize: 15, fontWeight: "600" },
  state: { alignItems: "center", paddingVertical: 18, gap: 9 },
  timingList: { marginTop: 14 },
  stateText: { color: colors.muted, fontSize: 12 },
  error: { color: colors.maroon, fontSize: 12, lineHeight: 18 },
  retry: { color: colors.gold, fontSize: 12, fontWeight: "700", marginTop: 10 },
  horoscope: { color: colors.text, fontSize: 13, lineHeight: 21 },
  suggestionTitle: { color: colors.maroonDark, fontFamily: "Georgia", fontSize: 17, fontWeight: "600", marginBottom: 8 },
  guidanceLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.2, fontWeight: "700", marginTop: 12, marginBottom: 5 },
  smallNote: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 10 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 15 },
});
