import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { colors } from "../theme/colors";

const deities = {
  Sunday: { name: "Surya Deva", image: require("../../assets/gods/surya.jpg"), audio: require("../../assets/god-audio/surya.mp3") },
  Monday: { name: "Lord Shiva", image: require("../../assets/gods/shiva.jpg"), audio: require("../../assets/god-audio/shiva.mp3") },
  Tuesday: { name: "Lord Hanuman", image: require("../../assets/gods/hanuman.jpg"), audio: require("../../assets/god-audio/hanuman.mp3") },
  Wednesday: { name: "Lord Ganesha", image: require("../../assets/gods/ganesh.jpg"), audio: require("../../assets/god-audio/ganesh.mp3") },
  Thursday: { name: "Lord Venkateswara", image: require("../../assets/gods/venkateshwara.jpg"), audio: require("../../assets/god-audio/venkateshwara.mp3") },
  Friday: { name: "Goddess Lakshmi", image: require("../../assets/gods/lakshmi.jpg"), audio: require("../../assets/god-audio/lakshmi.mp3") },
  Saturday: { name: "Lord Hanuman", image: require("../../assets/gods/hanuman.jpg"), audio: require("../../assets/god-audio/hanuman.mp3") },
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
        <Image source={deity.image} style={styles.image} resizeMode="cover" />
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
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(12, 7, 4, 0.30)" },
  content: { paddingHorizontal: 28, paddingBottom: 54, paddingTop: 42, backgroundColor: "rgba(18, 10, 6, 0.62)" },
  eyebrow: { color: "#E8C88D", fontSize: 9, letterSpacing: 2, fontWeight: "700" },
  deity: { color: "#FFF7E9", fontSize: 32, fontFamily: "Georgia", fontWeight: "700", marginTop: 13 },
  day: { color: "#E8C88D", fontSize: 11, letterSpacing: 3, marginTop: 8 },
  actions: { gap: 11, marginTop: 27 },
  secondary: { borderColor: "rgba(255,247,233,0.65)", borderWidth: 1, borderRadius: 13, padding: 14, alignItems: "center" },
  secondaryText: { color: "#FFF7E9", fontSize: 13, fontWeight: "600" },
  primary: { backgroundColor: "#E8C88D", borderRadius: 13, padding: 16, alignItems: "center" },
  primaryText: { color: "#321B0D", fontSize: 13, fontWeight: "800" },
  caption: { color: "#F4E6D2", textAlign: "center", fontSize: 11, marginTop: 18 }
});
