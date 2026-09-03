import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadSettings } from "../services/storage";
import { commitMultipleFiles } from "../services/githubApi";
import { pickFolderRecursive, pickMultipleFiles } from "../services/filePicker";
import Btn from "../components/Btn";

export default function UploadScreen({ route, navigation }) {
  const { owner, repo, branch, path: initialPath } = route.params;
  const [targetPath, setTargetPath] = useState(initialPath || "");
  const [selectedFiles, setSelectedFiles] = useState([]); // [{path, base64}]
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerStatus, setPickerStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");

  const joinPath = (p) => (targetPath ? `${targetPath}/${p}` : p);

  const onPickFolder = async () => {
    if (Platform.OS !== "android") {
      Alert.alert("تنبيه", "اختيار فولدر كامل متاح على Android بس دلوقتي");
      return;
    }
    setPickerBusy(true);
    setPickerStatus("جاري قراءة الفولدر...");
    try {
      const files = await pickFolderRecursive((count) =>
        setPickerStatus(`اتقرا ${count} ملف لحد دلوقتي...`)
      );
      setSelectedFiles(files);
      setPickerStatus(`جاهز: ${files.length} ملف من فولدر كامل`);
    } catch (e) {
      Alert.alert("خطأ", e.message);
      setPickerStatus("");
    } finally {
      setPickerBusy(false);
    }
  };

  const onPickFiles = async () => {
    setPickerBusy(true);
    setPickerStatus("جاري اختيار الملفات...");
    try {
      const files = await pickMultipleFiles();
      setSelectedFiles(files);
      setPickerStatus(`جاهز: ${files.length} ملف`);
    } catch (e) {
      Alert.alert("خطأ", e.message);
      setPickerStatus("");
    } finally {
      setPickerBusy(false);
    }
  };

  const onUpload = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert("خطأ", "اختار فولدر أو ملفات الأول");
      return;
    }
    setUploading(true);
    setPickerStatus("جاري الرفع لـ GitHub...");
    try {
      const s = await loadSettings();
      const filesForCommit = selectedFiles.map((f) => ({
        path: joinPath(f.path),
        base64: f.base64,
      }));

      await commitMultipleFiles(
        s.token,
        owner,
        repo,
        branch,
        filesForCommit,
        commitMsg.trim() || `Upload ${filesForCommit.length} file(s) via GitMobile`,
        (done, total) => setPickerStatus(`جاري رفع الملف ${done} من ${total}...`)
      );

      Alert.alert("تم بنجاح", `اترفع ${filesForCommit.length} ملف على الفرع ${branch}`, [
        { text: "تمام", onPress: () => navigation.goBack() },
      ]);
      setSelectedFiles([]);
      setPickerStatus("");
    } catch (e) {
      Alert.alert("فشل الرفع", e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>رفع لـ {repo} / {branch}</Text>

        <Text style={styles.label}>المسار المستهدف جوه الريبو (سيبه فاضي للـ root)</Text>
        <TextInput
          style={styles.input}
          value={targetPath}
          onChangeText={setTargetPath}
          placeholder="مثال: assets/images"
          autoCapitalize="none"
        />

        <Btn
          title="📁 اختر فولدر كامل (بيحافظ على شكله)"
          onPress={onPickFolder}
          disabled={pickerBusy || uploading}
          variant="secondary"
        />
        <Btn
          title="📄 اختر ملفات متعددة"
          onPress={onPickFiles}
          disabled={pickerBusy || uploading}
          variant="secondary"
        />

        {pickerStatus ? <Text style={styles.status}>{pickerStatus}</Text> : null}

        {selectedFiles.length > 0 && (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>هيترفع ({selectedFiles.length}):</Text>
            {selectedFiles.slice(0, 8).map((f, i) => (
              <Text key={i} style={styles.previewItem} numberOfLines={1}>
                • {joinPath(f.path)}
              </Text>
            ))}
            {selectedFiles.length > 8 && (
              <Text style={styles.previewItem}>...و {selectedFiles.length - 8} كمان</Text>
            )}
          </View>
        )}

        <Text style={styles.label}>رسالة الكوميت (اختياري)</Text>
        <TextInput
          style={styles.input}
          value={commitMsg}
          onChangeText={setCommitMsg}
          placeholder="Upload files"
        />

        <Btn
          title={uploading ? "جاري الرفع..." : "🚀 ابدأ الرفع"}
          onPress={onUpload}
          disabled={uploading || selectedFiles.length === 0}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  container: { padding: 20, gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 10 },
  label: { color: "#c9d1d9", marginTop: 10, marginBottom: 4, fontSize: 13 },
  input: {
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  status: { color: "#58a6ff", marginTop: 10, textAlign: "center" },
  previewBox: {
    backgroundColor: "#161b22",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  previewTitle: { color: "#fff", fontWeight: "600", marginBottom: 6 },
  previewItem: { color: "#8b949e", fontSize: 12 },
});
