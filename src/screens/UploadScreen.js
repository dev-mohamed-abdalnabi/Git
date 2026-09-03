import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { loadSettings } from "../services/storage";
import { commitMultipleFiles } from "../services/githubApi";
import { pickFolderRecursiveFromUri, pickMultipleFiles } from "../services/filePicker";
import { getFileIcon } from "../utils/fileIcons";
import Btn from "../components/Btn";

export default function UploadScreen({ route, navigation }) {
  const { owner, repo, branch, path: initialPath } = route.params;
  const [targetPath, setTargetPath] = useState(initialPath || "");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerStatus, setPickerStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [commitMsg, setCommitMsg] = useState("");
  const uploadLock = useRef(false);

  useEffect(() => {
    const uri = route.params?.selectedFolderUri;
    if (!uri) return;
    navigation.setParams({ selectedFolderUri: undefined });
    setPickerBusy(true);
    setPickerStatus("جاري قراءة الفولدر...");
    pickFolderRecursiveFromUri(uri, (count) => setPickerStatus(`اتقرا ${count} ملف...`))
      .then((files) => { setSelectedFiles(files); setPickerStatus(`جاهز: ${files.length} ملف من الفولدر`); })
      .catch((e) => Alert.alert("تعذر قراءة الفولدر", e.message))
      .finally(() => setPickerBusy(false));
  }, [route.params?.selectedFolderUri]);

  const joinPath = (p) => (targetPath ? `${targetPath}/${p}` : p);

  const onPickFolder = async () => {
    if (Platform.OS !== "android") {
      Alert.alert("تنبيه", "اختيار فولدر كامل متاح على Android بس دلوقتي");
      return;
    }
    navigation.navigate("FileBrowser", { startPath: "file:///storage/emulated/0" });
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
    if (uploadLock.current) return;
    if (selectedFiles.length === 0) {
      Alert.alert("خطأ", "اختار فولدر أو ملفات الأول");
      return;
    }
    uploadLock.current = true;
    setUploading(true);
    setProgress(0);
    try {
      const s = await loadSettings();
      const filesForCommit = selectedFiles.map((f) => ({ path: joinPath(f.path), base64: f.base64 }));

      await commitMultipleFiles(
        s.token, owner, repo, branch, filesForCommit,
        commitMsg.trim() || `Upload ${filesForCommit.length} file(s) via GitMobile`,
        (done, total) => { setProgress(done / total); setPickerStatus(`جاري رفع الملف ${done} من ${total}...`); }
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
      uploadLock.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Ionicons name="cloud-upload-outline" size={22} color="#58a6ff" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.title}>{repo}</Text>
            <Text style={styles.subtitle}>فرع {branch}</Text>
          </View>
        </View>

        <Text style={styles.label}>المسار المستهدف جوه الريبو</Text>
        <TextInput
          style={styles.input}
          value={targetPath}
          onChangeText={setTargetPath}
          placeholder="سيبه فاضي للـ root، أو مثال: assets/images"
          placeholderTextColor="#6e7681"
          autoCapitalize="none"
        />

        <View style={styles.pickRow}>
          <View style={styles.pickCol}>
            <Btn title="فولدر كامل" icon="folder-open-outline" onPress={onPickFolder} disabled={pickerBusy || uploading} variant="secondary" />
          </View>
          <View style={styles.pickCol}>
            <Btn title="ملفات متعددة" icon="documents-outline" onPress={onPickFiles} disabled={pickerBusy || uploading} variant="secondary" />
          </View>
        </View>

        {Platform.OS === "android" && (
          <Btn
            title="السماح بإدارة كل الملفات"
            icon="settings-outline"
            variant="secondary"
            onPress={() => Linking.openSettings()}
            disabled={pickerBusy || uploading}
          />
        )}

        {pickerStatus ? (
          <View style={styles.statusRow}>
            <Ionicons name="information-circle-outline" size={15} color="#58a6ff" />
            <Text style={styles.status}>{pickerStatus}</Text>
          </View>
        ) : null}

        {uploading && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        )}

        {selectedFiles.length > 0 && (
          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#3fb950" />
              <Text style={styles.previewTitle}>هيترفع ({selectedFiles.length})</Text>
            </View>
            {selectedFiles.slice(0, 8).map((f, i) => {
              const meta = getFileIcon(f.path);
              return (
                <View key={i} style={styles.previewRow}>
                  <Ionicons name={meta.icon} size={13} color={meta.color} />
                  <Text style={styles.previewItem} numberOfLines={1}>{joinPath(f.path)}</Text>
                </View>
              );
            })}
            {selectedFiles.length > 8 && (
              <Text style={styles.previewMore}>...و {selectedFiles.length - 8} كمان</Text>
            )}
          </View>
        )}

        <Text style={styles.label}>رسالة الكوميت (اختياري)</Text>
        <TextInput
          style={styles.input}
          value={commitMsg}
          onChangeText={setCommitMsg}
          placeholder="Upload files"
          placeholderTextColor="#6e7681"
        />

        <Btn
          title={uploading ? `جاري الرفع... ${Math.round(progress * 100)}%` : "ابدأ الرفع"}
          icon={uploading ? undefined : "rocket-outline"}
          loading={uploading}
          onPress={onUpload}
          disabled={uploading || selectedFiles.length === 0}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  container: { padding: 20, gap: 4 },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 12, color: "#8b949e", marginTop: 2 },
  label: { color: "#c9d1d9", marginTop: 12, marginBottom: 4, fontSize: 13 },
  input: {
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  pickRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pickCol: { flex: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "center" },
  status: { color: "#58a6ff", fontSize: 12 },
  progressTrack: {
    height: 6, backgroundColor: "#21262d", borderRadius: 3, marginTop: 10, overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: "#3fb950" },
  previewBox: {
    backgroundColor: "#161b22",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  previewTitle: { color: "#fff", fontWeight: "600" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  previewItem: { color: "#8b949e", fontSize: 12, flex: 1 },
  previewMore: { color: "#6e7681", fontSize: 12, marginTop: 4 },
});
