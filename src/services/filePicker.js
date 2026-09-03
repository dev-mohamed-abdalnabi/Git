// src/services/filePicker.js
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

const { StorageAccessFramework } = FileSystem;

// أي عملية بتاخد وقت أكتر من كده (بالميلي ثانية) بتتلغى تلقائي بدل ما تعلّق التطبيق للأبد
const OP_TIMEOUT = 15000;

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), OP_TIMEOUT)
    ),
  ]);
}

/**
 * اختيار فولدر كامل من الجهاز (Android فقط) والمحافظة على شكله بالكامل
 * بيرجع array: [{ path: "relative/path/inside/folder.ext", base64: "..." }]
 */
export async function pickFolderRecursive(onProgress) {
  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("مفيش صلاحية اختيار فولدر");
  }
  const rootUri = perm.directoryUri;
  const rootName = decodeURIComponent(rootUri.split("/").pop());

  const results = [];
  await walk(rootUri, rootName, results, onProgress);

  if (results.length === 0) {
    throw new Error("الفولدر ده فاضي أو مفيش ملفات ظهرتلنا جواه");
  }
  return results;
}

async function walk(uri, relativePrefix, results, onProgress) {
  const children = await withTimeout(
    StorageAccessFramework.readDirectoryAsync(uri),
    `قراءة ${relativePrefix}`
  );

  for (const childUri of children) {
    const name = decodeURIComponent(childUri.split("/").pop());
    const childRelativePath = `${relativePrefix}/${name}`;

    let info;
    try {
      // getInfoAsync بيرجع isDirectory مباشرة، من غير ما نحتاج نجرب ونغلط
      info = await withTimeout(
        FileSystem.getInfoAsync(childUri),
        `فحص ${childRelativePath}`
      );
    } catch (e) {
      // لو فشل الفحص لأي سبب، سيبه واستمر بدل ما نوقف كل الرفع
      console.warn(`اتخطى ${childRelativePath}: ${e.message}`);
      continue;
    }

    if (info.isDirectory) {
      await walk(childUri, childRelativePath, results, onProgress);
    } else {
      try {
        const base64 = await withTimeout(
          FileSystem.readAsStringAsync(childUri, {
            encoding: FileSystem.EncodingType.Base64,
          }),
          `قراءة ${childRelativePath}`
        );
        results.push({ path: childRelativePath, base64 });
        if (onProgress) onProgress(results.length);
      } catch (e) {
        console.warn(`اتخطى ${childRelativePath}: ${e.message}`);
      }
    }
  }
}

/**
 * اختيار عدة ملفات منفصلة (يشتغل على Android وiOS)
 */
export async function pickMultipleFiles() {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: "*/*",
  });

  if (result.canceled) return [];

  const assets = result.assets || [];
  const files = [];
  for (const asset of assets) {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    files.push({ path: asset.name, base64 });
  }
  return files;
}
