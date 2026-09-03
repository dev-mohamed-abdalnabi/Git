// src/services/filePicker.js
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

const { StorageAccessFramework } = FileSystem;

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
  return results;
}

async function walk(uri, relativePrefix, results, onProgress) {
  const children = await StorageAccessFramework.readDirectoryAsync(uri);
  for (const childUri of children) {
    const name = decodeURIComponent(childUri.split("/").pop());
    let isDirectory = false;
    let entries = null;
    try {
      // لو نجحنا نقرأه كـ directory يبقى هو فولدر
      entries = await StorageAccessFramework.readDirectoryAsync(childUri);
      isDirectory = true;
    } catch (e) {
      isDirectory = false;
    }

    const childRelativePath = `${relativePrefix}/${name}`;

    if (isDirectory) {
      await walk(childUri, childRelativePath, results, onProgress);
    } else {
      const base64 = await FileSystem.readAsStringAsync(childUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      results.push({ path: childRelativePath, base64 });
      if (onProgress) onProgress(results.length);
    }
  }
}

/**
 * اختيار عدة ملفات منفصلة (يشتغل على Android وiOS)
 * بيرجع array: [{ path: "name.ext", base64: "..." }]
 * المستخدم بعدين يقدر يحدد مسار الفولدر المستهدف جوه الريبو من الشاشة
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
