import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { useLanguage } from "../i18n";

const deities = {
  Sunday: { name: "Surya Deva", image: require("../../assets/surya dev/images.jpg"), audio: require("../../assets/audios/surya dev.mp3") },
  Monday: { name: "Lord Shiva", image: require("../../assets/lord shiva/images.jpg"), audio: require("../../assets/audios/shiva.mp3") },
  Tuesday: { name: "Lord Hanuman", image: require("../../assets/hanuman/images.jpg"), audio: require("../../assets/audios/hanuman.mp3") },
  Wednesday: { name: "Lord Ganesha", image: require("../../assets/ganesh/lord-ganesha-traditional-nature-ai-image-4k-1080p-774805.jpg"), audio: require("../../assets/audios/ganesh.mp3") },
  Thursday: { name: "Lord Venkateswara", image: require("../../assets/venkateswara swamy/images.jpg"), audio: require("../../assets/audios/venkateshwara swamy.mp3") },
  Friday: { name: "Goddess Lakshmi", image: require("../../assets/lakshmi devi/images.jpg"), audio: require("../../assets/audios/lakshmi devi.mp3") },
  Saturday: { name: "Lord Hanuman", image: require("../../assets/hanuman/images.jpg"), audio: require("../../assets/audios/hanuman.mp3") },
};

export function DailyDeityWelcome({ visible, onContinue }: { visible: boolean; onContinue: () => void }) {\n  const { t } = useLanguage();
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()) as keyof typeof deities;
  const deity = useMemo(() => deities[weekday] || deities.Monday, [weekday]);
  const [muted, setMuted] = useState(false);
  const player = useAudioPlayer(deity.audio);

  useEffect(() => {
    player.loop = true;
    player.volume = muted ? 0 : 0.55;
    if (visible && !muted) player.play();
    else player.pause();
    return () => { player.pause(); };
  }, [player, visible, muted, deity]);

  const continueToApp = () => {
    player.pause();
    onContinue();
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={continueToApp}>
      <View style={styles.root}>
        <Image source={deity.image} style={styles.image} resizeMode="contain" />
        <View pointerEvents="none" style={styles.scrim} />
        <View style={styles.content}>
          <Text style={styles.eyebrow}>{t("KAALAM · TODAY'S DIVINE BLESSING")}</Text>
          <Text style={styles.deity}>{deity.name}</Text>
          <Text style={styles.day}>{weekday.toUpperCase()}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setMuted(value => !value)}>
              <Text style={styles.secondaryText}>{muted ? "♫  Turn music on" : "♫  Mute music"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.primary} onPress={continueToApp}>
              <Text style={styles.primaryText}>{t("Continue to KAALAM  →")}</Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>{t("May your day be peaceful and blessed.")}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#100905", alignItems: "center", justifyContent: "center" },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(12, 7, 4, 0.12)" },
  content: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 26, paddingTop: 34, paddingBottom: 42, backgroundColor: "rgba(18, 10, 6, 0.48)", borderTopWidth: 1, borderTopColor: "rgba(232, 200, 141, 0.28)" },
  eyebrow: { color: "#F0D7A8", fontSize: 9, letterSpacing: 2, fontWeight: "700", fontFamily: "sans-serif" },
  deity: { color: "#FFF7E9", fontSize: 34, fontFamily: "serif", fontWeight: "600", letterSpacing: 0.2, marginTop: 13, textShadowColor: "rgba(0,0,0,0.65)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  day: { color: "#F0D7A8", fontSize: 11, letterSpacing: 3, marginTop: 8, fontFamily: "sans-serif-medium" },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  secondary: { flex: 1, borderColor: "rgba(255,247,233,0.8)", borderWidth: 1, borderRadius: 13, paddingVertical: 15, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20, 12, 8, 0.42)" },
  secondaryText: { color: "#FFF7E9", fontSize: 12, fontWeight: "700", fontFamily: "sans-serif" },
  primary: { flex: 1.5, backgroundColor: "#E8C88D", borderRadius: 13, paddingVertical: 16, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#321B0D", fontSize: 12, fontWeight: "800", fontFamily: "sans-serif" },
  caption: { color: "#FFF1DC", textAlign: "center", fontSize: 13, marginTop: 17, fontFamily: "serif", fontStyle: "italic", textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }
});
