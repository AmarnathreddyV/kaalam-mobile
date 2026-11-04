import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { PageHeading, Panel } from "../components/Screen";
import { colors } from "../theme/colors";
import { useLanguage } from "../i18n";

const songs = [
  { title: "Sri Venkatesha Suprabhatam", deity: "Lord Venkateswara", source: require("../../devotional-song/sri_venkatesha_suprabhatam.mp3") },
  { title: "Lingashtakam", deity: "Lord Shiva", source: require("../../devotional-song/lingashtakam_lord_shiva.mp3") },
  { title: "Garuda Gamana Tava", deity: "Lord Maha Vishnu", source: require("../../devotional-song/garuda_gamana_tava_sri_maha_vishnu_stotram.mp3") },
  { title: "Hanuman Chalisa", deity: "Lord Hanuman", source: require("../../devotional-song/hanuman_chalisa.mp3") },
  { title: "Ganpati Stotram", deity: "Lord Ganesha", source: require("../../devotional-song/ganpati_stotram.mp3") },
  { title: "Aarti Sai Baba", deity: "Sai Baba", source: require("../../devotional-song/aarti_saibaba.mp3") },
];

export function DevotionalSongsScreen() {
  const { t } = useLanguage();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    return () => { player.pause(); };
  }, [player]);

  const playSong = (index: number) => {
    if (activeIndex === index) {
      if (status.playing) player.pause();
      else player.play();
      return;
    }
    setActiveIndex(index);
    try {
      player.replace(songs[index].source);
      player.play();
    } catch (error) {
      console.error("KAALAM devotional audio playback failed:", error);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <PageHeading title={t("Devotional Songs")} subtitle={t("Listen to devotional prayers and stotrams.")} />
      <Panel style={styles.intro}>
        <Text style={styles.introTitle}>{t("A moment of devotion")}</Text>
        <Text style={styles.introText}>{t("Choose a prayer below to listen. You can pause and resume any song.")}</Text>
      </Panel>
      {songs.map((song, index) => {
        const selected = activeIndex === index;
        return (
          <TouchableOpacity key={song.title} activeOpacity={0.82} onPress={() => playSong(index)} style={[styles.song, selected && styles.songActive]}>
            <View style={styles.musicIcon}><Text style={styles.musicGlyph}>♫</Text></View>
            <View style={styles.songInfo}>
              <Text style={styles.songTitle}>{t(song.title)}</Text>
              <Text style={styles.deity}>{t(song.deity)}</Text>
              {selected && status.isBuffering && <Text style={styles.state}>{t("Loading audio…")}</Text>}
              {selected && status.error && <Text style={styles.errorText}>{String(status.error)}</Text>}
            </View>
            <View style={styles.playButton}><Text style={styles.playGlyph}>{selected && status.playing ? "Ⅱ" : "▶"}</Text></View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.footer}>{t("Songs are stored on your device and can play without an internet connection.")}</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  intro: { marginBottom: 14 }, introTitle: { color: colors.maroonDark, fontSize: 17, fontWeight: "700", fontFamily: "Georgia" },
  introText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  song: { flexDirection: "row", alignItems: "center", padding: 13, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(255,247,230,0.94)", marginBottom: 10 },
  songActive: { borderColor: colors.gold, backgroundColor: "rgba(239,218,175,0.55)" },
  musicIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(113,55,15,0.10)", alignItems: "center", justifyContent: "center" },
  musicGlyph: { color: colors.maroon, fontSize: 24 }, songInfo: { flex: 1, paddingHorizontal: 12 },
  songTitle: { color: colors.text, fontSize: 13, fontWeight: "700" }, deity: { color: colors.muted, fontSize: 11, marginTop: 4 },
  state: { color: colors.gold, fontSize: 10, marginTop: 3 }, errorText: { color: "#B00020", fontSize: 10, marginTop: 3 }, playButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.maroon, alignItems: "center", justifyContent: "center" },
  playGlyph: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" }, footer: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 8, paddingHorizontal: 3 },
});
