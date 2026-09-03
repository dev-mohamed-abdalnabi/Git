import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Btn from "../components/Btn";
import { saveSettings, loadSettings, clearSettings } from "../services/storage";
import { listUserRepos } from "../services/githubApi";

export default function SettingsScreen({ navigation }) {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [defaultRepo, setDefaultRepo] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setToken(s.token);
      setUsername(s.username);
      setDefaultRepo(s.defaultRepo);
      setDefaultBranch(s.defaultBranch);
    })();
  }, []);

  const onSave = async () => {
    if (!token.trim()) return Alert.alert("خطأ", "لازم تدخل الـ GitHub Token");
    setLoading(true);
    try {
      await saveSettings({ token: token.trim(), username: username.trim(), defaultRepo: defaultRepo.trim(), defaultBranch: defaultBranch.trim() || "main" });
      Alert.alert("تم", "الإعدادات اتحفظت بأمان على الجهاز");
    } catch (e) {
      Alert.alert("خطأ", e.message);
    } finally {
      setLoading(false);
    }
  };

  const onTestToken = async () => {
    if (!token.trim()) return Alert.alert("خطأ", "دخل التوكن الأول");
    setTesting(true);
    try {
      const repos = await listUserRepos(token.trim());
      Alert.alert("تمام", `التوكن شغال، لقينا ${repos.length} ريبو`);
    } catch (e) {
      Alert.alert("فشل", e.message);
    } finally {
      setTesting(false);
    }
  };

  const onClear = async () => {
    Alert.alert("تأكيد", "هيمسح التوكن وكل الإعدادات من الجهاز؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "مسح", style: "destructive",
        onPress: async () => {
          await clearSettings();
          setToken(""); setUsername(""); setDefaultRepo(""); setDefaultBranch("main");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Ionicons name="logo-github" size={30} color="#fff" />
          </View>
          <Text style={styles.title}>GitMobile</Text>
          <Text style={styles.tagline}>إدارة GitHub بالكامل من موبايلك</Text>
        </View>

        <View style={styles.sectionHead}>
          <Ionicons name="key-outline" size={15} color="#8b949e" />
          <Text style={styles.sectionLabel}>الدخول</Text>
        </View>

        <Text style={styles.label}>GitHub Personal Access Token</Text>
        <TextInput style={styles.input} value={token} onChangeText={setToken} placeholder="ghp_xxxxxxxxxxxx" placeholderTextColor="#6e7681" secureTextEntry autoCapitalize="none" />

        <Text style={styles.label}>اسم المستخدم (Username)</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="dev-mohamed-abdalnabi" placeholderTextColor="#6e7681" autoCapitalize="none" />

        <View style={styles.sectionHead}>
          <Ionicons name="git-branch-outline" size={15} color="#8b949e" />
          <Text style={styles.sectionLabel}>الافتراضيات</Text>
        </View>

        <Text style={styles.label}>الريبو الافتراضي (اختياري - owner/repo)</Text>
        <TextInput style={styles.input} value={defaultRepo} onChangeText={setDefaultRepo} placeholder="dev-mohamed-abdalnabi/mem" placeholderTextColor="#6e7681" autoCapitalize="none" />

        <Text style={styles.label}>الفرع الافتراضي</Text>
        <TextInput style={styles.input} value={defaultBranch} onChangeText={setDefaultBranch} placeholder="main" placeholderTextColor="#6e7681" autoCapitalize="none" />

        <Btn title={testing ? "جاري الاختبار..." : "اختبار التوكن"} icon="checkmark-circle-outline" loading={testing} onPress={onTestToken} variant="secondary" />
        <Btn title={loading ? "جاري الحفظ..." : "حفظ الإعدادات"} icon="save-outline" loading={loading} onPress={onSave} />
        <Btn title="اذهب للريبوهات" icon="albums-outline" onPress={() => navigation.navigate("RepoSelect")} variant="secondary" />
        <Btn title="مسح كل البيانات" icon="trash-outline" onPress={onClear} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  container: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  logoCircle: {
    width: 62, height: 62, borderRadius: 18, backgroundColor: "#161b22",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#30363d", marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
  tagline: { fontSize: 12, color: "#8b949e", marginTop: 4 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18, marginBottom: 2 },
  sectionLabel: { color: "#8b949e", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  label: { color: "#c9d1d9", marginTop: 10, marginBottom: 4, fontSize: 13 },
  input: {
    backgroundColor: "#161b22", color: "#fff", borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, borderWidth: 1, borderColor: "#30363d",
  },
});
