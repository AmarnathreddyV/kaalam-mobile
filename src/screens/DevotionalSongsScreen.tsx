import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { PageHeading, Panel } from "../components/Screen";
import { colors } from "../theme/colors";
import { useLanguage } from "../i18n";

const albums = [
  {
    id: "venkateswara",
    deity: "Lord Venkateswara",
    title: "Sri Venkatesha Suprabhatam",
    source: require("../../devotional-song/sri_venkatesha_suprabhatam.mp3"),
    image: require("../../assets/venkateswara swamy/images.jpg"),
  },
  {
    id: "shiva",
    deity: "Lord Shiva",
    title: "Lingashtakam",
    source: require("../../devotional-song/lingashtakam_lord_shiva.mp3"),
    image: require("../../assets/lord shiva/images.jpg"),
  },
  {
    id: "vishnu",
    deity: "Lord Maha Vishnu",
    title: "Garuda Gamana Tava",
    source: require("../../devotional-song/garuda_gamana_tava_sri_maha_vishnu_stotram.mp3"),
    // The existing Venkateswara artwork depicts a form of Lord Vishnu.
    image: require("../../assets/venkateswara swamy/images (1).jpg"),
  },
  {
    id: "hanuman",
    deity: "Lord Hanuman",
    title: "Hanuman Chalisa",
    source: require("../../devotional-song/hanuman_chalisa.mp3"),
    image: require("../../assets/hanuman/images.jpg"),
  },
  {
    id: "ganesha",
    deity: "Lord Ganesha",
    title: "Ganpati Stotram",
    source: require("../../devotional-song/ganpati_stotram.mp3"),
    image: require("../../assets/ganesh/6c08416196ba6fcee370dc04547a94cb.jpg"),
  },
  {
    id: "saibaba",
    deity: "Sai Baba",
    title: "Aarti Sai Baba",
    source: require("../../devotional-song/aarti_saibaba.mp3"),
    image: require("../../assets/sai baba/images.jpg"),
  },
];

export function DevotionalSongsScreen() {
  const { t } = useLanguage();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [playingAlbumId, setPlayingAlbumId] = useState<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    return () => { player.pause(); };
  }, [player]);

  const playAlbumSong = (albumId: string) => {
    const album = albums.find((item) => item.id === albumId);
    if (!album) return;

    if (playingAlbumId === albumId) {
      if (status.playing) player.pause();
      else player.play();
      return;
    }

    setPlayingAlbumId(albumId);
    try {
      player.replace(album.source);
      player.play();
    } catch (error) {
      console.error("KAALAM devotional audio playback failed:", error);
    }
  };

  const selectedAlbum = albums.find((album) => album.id === activeAlbumId);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PageHeading
        title={t("Devotional Albums")}
        subtitle={t("Choose a deity album and listen to its devotional song.")}
      />

      <Panel style={styles.intro}>
        <Text style={styles.introTitle}>{t("A moment of devotion")}</Text>
        <Text style={styles.introText}>
          {t("Explore devotional albums. More songs can be added to each album anytime.")}
        </Text>
      </Panel>

      <View style={styles.albumGrid}>
        {albums.map((album) => {
          const selected = activeAlbumId === album.id;
          const isPlaying = playingAlbumId === album.id && status.playing;
          return (
            <TouchableOpacity
              key={album.id}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={t(album.deity) + " album"}
              accessibilityState={{ selected }}
              onPress={() => setActiveAlbumId(selected ? null : album.id)}
              style={[styles.albumCard, selected && styles.albumCardSelected]}
            >
              <Image source={album.image} style={styles.albumImage} resizeMode="cover" />
              <View style={styles.albumMeta}>
                <Text numberOfLines={1} style={styles.deityName}>{t(album.deity)}</Text>
                <Text numberOfLines={2} style={styles.trackName}>{t(album.title)}</Text>
                <View style={styles.albumBottom}>
                  <Text style={styles.trackCount}>{t("1 song")}</Text>
                  <View style={styles.playButton}>
                    <Text style={styles.playGlyph}>{isPlaying ? "Ⅱ" : "▶"}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedAlbum && (
        <View style={styles.albumDetail}>
          <Text style={styles.detailEyebrow}>{t("NOW IN ALBUM")}</Text>
          <Text style={styles.detailDeity}>{t(selectedAlbum.deity)}</Text>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => playAlbumSong(selectedAlbum.id)}
            style={styles.trackRow}
          >
            <View style={styles.trackNumber}><Text style={styles.trackNumberText}>01</Text></View>
            <View style={styles.trackInfo}>
              <Text style={styles.detailTrackTitle}>{t(selectedAlbum.title)}</Text>
              <Text style={styles.detailTrackSubtitle}>{t(selectedAlbum.deity)}</Text>
              {playingAlbumId === selectedAlbum.id && status.isBuffering && (
                <Text style={styles.state}>{t("Loading audio…")}</Text>
              )}
              {playingAlbumId === selectedAlbum.id && status.error && (
                <Text style={styles.errorText}>{t(String(status.error))}</Text>
              )}
            </View>
            <View style={styles.detailPlayButton}>
              <Text style={styles.detailPlayGlyph}>
                {playingAlbumId === selectedAlbum.id && status.playing ? "Ⅱ" : "▶"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.footer}>
        {t("Songs are stored on your device and can play without an internet connection.")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 42 },
  intro: { marginBottom: 18 },
  introTitle: { color: colors.maroonDark, fontSize: 20, fontWeight: "500", fontFamily: "Georgia" },
  introText: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  albumGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  albumCard: {
    width: "48.3%",
    marginBottom: 14,
    overflow: "hidden",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(250,247,239,0.98)",
  },
  albumCardSelected: { borderColor: colors.gold, borderWidth: 2 },
  albumImage: { width: "100%", height: 158, backgroundColor: colors.pale },
  albumMeta: { paddingHorizontal: 11, paddingTop: 10, paddingBottom: 11 },
  deityName: { color: colors.maroonDark, fontSize: 13, fontWeight: "700" },
  trackName: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4, minHeight: 30 },
  albumBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  trackCount: { color: colors.gold, fontSize: 10, fontWeight: "600" },
  playButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.maroonDark, alignItems: "center", justifyContent: "center" },
  playGlyph: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  albumDetail: { marginTop: 7, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(250,247,239,0.98)" },
  detailEyebrow: { color: colors.gold, fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  detailDeity: { color: colors.maroonDark, fontSize: 19, fontFamily: "Georgia", marginTop: 5, marginBottom: 12 },
  trackRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  trackNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  trackNumberText: { color: colors.maroon, fontSize: 11, fontWeight: "700" },
  trackInfo: { flex: 1, paddingHorizontal: 11 },
  detailTrackTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  detailTrackSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
  detailPlayButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.maroonDark, alignItems: "center", justifyContent: "center" },
  detailPlayGlyph: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  state: { color: colors.gold, fontSize: 10, marginTop: 4 },
  errorText: { color: "#B00020", fontSize: 10, marginTop: 4 },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 12, paddingHorizontal: 3 },
});
