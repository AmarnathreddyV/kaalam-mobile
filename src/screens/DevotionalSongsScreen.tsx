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

type Album = {
  id: string;
  deity: string;
  category: "Deity" | "Festival";
  songs?: { id: string; title: string; source: number }[];
  image?: number;
};

const albums: Album[] = [
  { id: "venkateswara", deity: "Sri Venkateswara Swamy", category: "Deity", songs: [
    { id: "suprabhatam", title: "Sri Venkatesha Suprabhatam", source: require("../../devotional-song/sri_venkatesha_suprabhatam.mp3") },
    { id: "yedukondala-vasa", title: "Yedukondala Vasa, Sri Venkatesa", source: require("../../devotional-song/yedukondala_vasa_sri_venkatesa.mp3") },
    { id: "edukondala-venkateswara", title: "Edukondala Venkateswara", source: require("../../devotional-song/edukondala_venkateswara.mp3") },
    { id: "venkatesha-stotram-1", title: "Sri Venkatesha Stotram", source: require("../../devotional-song/sri_venkatesha_stotram.mp3") },
    { id: "venkatesha-stotram-2", title: "Venkatesha Stotram", source: require("../../devotional-song/venkatesha_stotram.mp3") },
    { id: "lord-venkateswara", title: "Lord Venkateswara", source: require("../../devotional-song/lord_venkateswara.mp3") },
  ], image: require("../../assets/venkateswara swamy/images.jpg") },
  { id: "hanuman", deity: "Lord Hanuman", category: "Deity", songs: [{ id: "hanuman-chalisa", title: "Hanuman Chalisa", source: require("../../devotional-song/hanuman_chalisa.mp3") }, { id: "hanuman-dandakam", title: "Sri Hanuman Dandakam", source: require("../../devotional-song/sri_hanuman_dandakam.mp3") }], image: require("../../assets/hanuman/images.jpg") },
  { id: "murugan", deity: "Lord Murugan", category: "Deity" },
  { id: "sriram", deity: "Lord Sri Rama", category: "Deity" },
  { id: "shiva", deity: "Lord Shiva", category: "Deity", songs: [{ id: "lingashtakam", title: "Lingashtakam", source: require("../../devotional-song/lingashtakam_lord_shiva.mp3") }], image: require("../../assets/lord shiva/images.jpg") },
  { id: "ganesha", deity: "Lord Ganesha", category: "Deity", songs: [{ id: "ganpati-stotram", title: "Ganpati Stotram", source: require("../../devotional-song/ganpati_stotram.mp3") }], image: require("../../assets/ganesh/6c08416196ba6fcee370dc04547a94cb.jpg") },
  { id: "durga", deity: "Goddess Durga", category: "Deity" },
  { id: "bhadrakali", deity: "Bhadrakali Devi", category: "Deity" },
  { id: "lakshmi", deity: "Goddess Lakshmi", category: "Deity", image: require("../../assets/lakshmi devi/images.jpg") },
  { id: "narasimha", deity: "Lord Narasimha Swamy", category: "Deity" },
  { id: "ayyappa", deity: "Lord Ayyappa", category: "Deity" },
  { id: "subramanya", deity: "Lord Subramanya Swamy", category: "Deity" },
  { id: "sammakka-sarakka", deity: "Sammakka & Sarakka", category: "Deity" },
  { id: "bathukamma", deity: "Bathukamma", category: "Festival" },
  { id: "saraswathi", deity: "Saraswathi Devi", category: "Deity" },
  { id: "shiva-parvathi", deity: "Shiva & Parvathi", category: "Deity" },
  { id: "jagannath", deity: "Puri Jagannath", category: "Deity" },
  { id: "peddamma", deity: "Peddamma Thalli", category: "Deity" },
  { id: "saibaba", deity: "Sai Baba", category: "Deity", songs: [{ id: "aarti-sai-baba", title: "Aarti Sai Baba", source: require("../../devotional-song/aarti_saibaba.mp3") }], image: require("../../assets/sai baba/images.jpg") },
  { id: "varahi", deity: "Varahi Ammavaru", category: "Deity" },
  { id: "bhu-varahi", deity: "Bhu Varahi Ammavaru", category: "Deity" },
  { id: "vishnu", deity: "Vishnu Murthy", category: "Deity", songs: [{ id: "garuda-gamana", title: "Garuda Gamana Tava", source: require("../../devotional-song/garuda_gamana_tava_sri_maha_vishnu_stotram.mp3") }], image: require("../../assets/venkateswara swamy/images (1).jpg") },
];

export function DevotionalSongsScreen() {
  const { t } = useLanguage();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [playingAlbumId, setPlayingAlbumId] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    return () => { player.pause(); };
  }, [player]);

  const playAlbumSong = (albumId: string, trackId: string) => {
    const album = albums.find((item) => item.id === albumId);
    const track = album?.songs?.find((item) => item.id === trackId);
    if (!track) return;

    if (playingAlbumId === albumId && playingTrackId === trackId) {
      if (status.playing) player.pause();
      else player.play();
      return;
    }

    setPlayingAlbumId(albumId);
    setPlayingTrackId(trackId);
    try {
      player.replace(track.source);
      player.play();
    } catch (error) {
      console.error("KAALAM devotional audio playback failed:", error);
    }
  };

  const selectedAlbum = albums.find((album) => album.id === activeAlbumId);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <PageHeading
        title={t("Devotional Albums")}
        subtitle={t("Browse devotional albums for the deities and traditions you love. Songs can be added later.")}
      />

      <Panel style={styles.intro}>
        <Text style={styles.introTitle}>{t("A moment of devotion")}</Text>
        <Text style={styles.introText}>
          {t("Explore the KAALAM devotional collection. Album artwork and songs can be added or updated over time.")}
        </Text>
        <Text style={styles.collectionCount}>{albums.length} {t("albums")}</Text>
      </Panel>

      <View style={styles.albumGrid}>
        {albums.map((album) => {
          const selected = activeAlbumId === album.id;
          const isPlaying = playingAlbumId === album.id && status.playing;
          const songCount = album.songs?.length ?? 0;
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
              {album.image ? (
                <Image source={album.image} style={styles.albumImage} resizeMode="cover" />
              ) : (
                <View style={styles.artPlaceholder}>
                  <Text style={styles.placeholderOm}>ॐ</Text>
                  <Text style={styles.placeholderName}>{t(album.deity)}</Text>
                  <Text style={styles.placeholderCaption}>{t("Artwork coming soon")}</Text>
                </View>
              )}
              <View style={styles.albumMeta}>
                <Text numberOfLines={2} style={styles.deityName}>{t(album.deity)}</Text>
                <Text style={styles.category}>{t(album.category)}</Text>
                <View style={styles.albumBottom}>
                  <Text style={styles.trackCount}>{songCount ? `${songCount} songs` : t("Songs coming soon")}</Text>
                  <View style={[styles.playButton, !album.source && styles.pendingButton]}>
                    <Text style={styles.playGlyph}>{songCount ? (isPlaying ? "Ⅱ" : "▶") : "+"}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedAlbum && (
        <View style={styles.albumDetail}>
          <Text style={styles.detailEyebrow}>{t("SELECTED ALBUM")}</Text>
          <Text style={styles.detailDeity}>{t(selectedAlbum.deity)}</Text>
          {selectedAlbum.songs?.length ? (
            selectedAlbum.songs.map((track, index) => {
              const isCurrentTrack = playingAlbumId === selectedAlbum.id && playingTrackId === track.id;
              return (
                <TouchableOpacity key={track.id} activeOpacity={0.82} onPress={() => playAlbumSong(selectedAlbum.id, track.id)} style={styles.trackRow}>
                  <View style={styles.trackNumber}><Text style={styles.trackNumberText}>{String(index + 1).padStart(2, "0")}</Text></View>
                  <View style={styles.trackInfo}>
                    <Text style={styles.detailTrackTitle}>{t(track.title)}</Text>
                    <Text style={styles.detailTrackSubtitle}>{t(selectedAlbum.deity)}</Text>
                    {isCurrentTrack && status.isBuffering && <Text style={styles.state}>{t("Loading audio…")}</Text>}
                    {isCurrentTrack && status.error && <Text style={styles.errorText}>{t(String(status.error))}</Text>}
                  </View>
                  <View style={styles.detailPlayButton}>
                    <Text style={styles.detailPlayGlyph}>{isCurrentTrack && status.playing ? "Ⅱ" : "▶"}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.pendingTrack}>
              <Text style={styles.pendingTrackTitle}>{t("Songs will be added to this album later.")}</Text>
              <Text style={styles.detailTrackSubtitle}>{t("This album is ready for your devotional audio files.")}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.footer}>
        {t("Existing tracks play offline. New albums are listed now; their songs and dedicated artwork can be added later.")}
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
  collectionCount: { color: colors.gold, fontSize: 11, fontWeight: "700", marginTop: 10 },
  albumGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  albumCard: { width: "48.3%", marginBottom: 14, overflow: "hidden", borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(250,247,239,0.98)" },
  albumCardSelected: { borderColor: colors.gold, borderWidth: 2 },
  albumImage: { width: "100%", height: 158, backgroundColor: colors.pale },
  artPlaceholder: { width: "100%", height: 158, backgroundColor: "#3B1820", alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "rgba(169,133,69,0.4)" },
  placeholderOm: { color: "#E8C88D", fontSize: 38, fontFamily: "serif" },
  placeholderName: { color: "#FFF7E9", fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 5 },
  placeholderCaption: { color: "#E8C88D", fontSize: 9, marginTop: 5, letterSpacing: 0.5 },
  albumMeta: { paddingHorizontal: 11, paddingTop: 10, paddingBottom: 11 },
  deityName: { color: colors.maroonDark, fontSize: 13, fontWeight: "700", minHeight: 32 },
  category: { color: colors.muted, fontSize: 9, marginTop: 2, letterSpacing: 0.6 },
  albumBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  trackCount: { color: colors.gold, fontSize: 9, fontWeight: "600", flexShrink: 1 },
  playButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.maroonDark, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  pendingButton: { backgroundColor: colors.gold },
  playGlyph: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
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
  pendingTrack: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line },
  pendingTrackTitle: { color: colors.maroonDark, fontSize: 12, fontWeight: "700" },
  state: { color: colors.gold, fontSize: 10, marginTop: 4 },
  errorText: { color: "#B00020", fontSize: 10, marginTop: 4 },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 12, paddingHorizontal: 3 },
});
