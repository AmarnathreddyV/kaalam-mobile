import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer } from "expo-audio";

const deities = {
  Sunday: { name: "Surya Deva", image: require("../../assets/surya dev/images.jpg"), audio: require("../../assets/audios/surya dev.mp3") },
  Monday: { name: "Lord Shiva", image: require("../../assets/lord shiva/images.jpg"), audio: require("../../assets/audios/shiva.mp3") },
  Tuesday: { name: "Lord Hanuman", image: require("../../assets/hanuman/images.jpg"), audio: require("../../assets/audios/hanuman.mp3") },
  Wednesday: { name: "Lord Ganesha", image: require("../../assets/ganesh/lord-ganesha-traditional-nature-ai-image-4k-1080p-774805.jpg"), audio: require("../../assets/audios/ganesh.mp3") },
  Thursday: { name: "Lord Venkateswara", image: require("../../assets/venkateswara swamy/images.jpg"), audio: require("../../assets/audios/venkateshwara swamy.mp3") },
  Friday: { name: "Goddess Lakshmi", image: require("../../assets/lakshmi devi/images.jpg"), audio: require("../../assets/audios/lakshmi devi.mp3") },
  Saturday: { name: "Lord Hanuman", image: require("../../assets/hanuman/images.jpg"), audio: require("../../assets/audios/hanuman.mp3") },
};

export function DailyDeityWelcome({ visible, onContinue }: { visible: boolean; onContinue: () => void }) {
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
        <View style={styles.scrim} />
        <View style={styles.content}>
          <Text style={styles.eyebrow}>KAALAM · TODAY'S DIVINE BLESSING</Text>
          <Text style={styles.deity}>{deity.name}</Text>
          <Text style={styles.day}>{weekday.toUpperCase()}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={() => setMuted(value => !value)}>
              <Text style={styles.secondaryText}>{muted ? "Turn music on" : "Mute music"}</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={continueToApp}>
              <Text style={styles.primaryText}>Continue to KAALAM  →</Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>May your day be peaceful and blessed.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#170D08", justifyContent: "flex-end" },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(12, 7, 4, 0.18)" },
  content: { paddingHorizontal: 28, paddingBottom: 54, paddingTop: 30, backgroundColor: "rgba(18, 10, 6, 0.58)" },
  eyebrow: { color: "#E8C88D", fontSize: 9, letterSpacing: 2, fontWeight: "700", fontFamily: "sans-serif" },
  deity: { color: "#FFF7E9", fontSize: 34, fontFamily: "serif", fontWeight: "600", letterSpacing: 0.2, marginTop: 13 },
  day: { color: "#E8C88D", fontSize: 11, letterSpacing: 3, marginTop: 8, fontFamily: "sans-serif-medium" },
  actions: { gap: 11, marginTop: 22 },
  secondary: { borderColor: "rgba(255,247,233,0.65)", borderWidth: 1, borderRadius: 13, padding: 14, alignItems: "center" },
  secondaryText: { color: "#FFF7E9", fontSize: 13, fontWeight: "600", fontFamily: "sans-serif" },
  primary: { backgroundColor: "#E8C88D", borderRadius: 13, padding: 16, alignItems: "center" },
  primaryText: { color: "#321B0D", fontSize: 13, fontWeight: "800", fontFamily: "sans-serif" },
  caption: { color: "#F4E6D2", textAlign: "center", fontSize: 13, marginTop: 16, fontFamily: "serif", fontStyle: "italic" }
});
