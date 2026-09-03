// src/services/githubApi.js
// كل التعامل مع GitHub REST + Git Data API بيحصل هنا

const BASE = "https://api.github.com";

function authHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `GitHub API error (${res.status})`;
    try {
      const body = await res.json();
      msg += `: ${body.message || JSON.stringify(body)}`;
    } catch (e) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- Repos & Branches ----------

export async function listUserRepos(token) {
  return ghFetch(`${BASE}/user/repos?per_page=100&sort=updated`, token);
}

export async function listBranches(token, owner, repo) {
  return ghFetch(`${BASE}/repos/${owner}/${repo}/branches?per_page=100`, token);
}

export async function createBranch(token, owner, repo, baseBranch, newBranch) {
  const baseRef = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    token
  );
  return ghFetch(`${BASE}/repos/${owner}/${repo}/git/refs`, token, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${newBranch}`,
      sha: baseRef.object.sha,
    }),
  });
}

// ---------- Browse contents ----------

export async function listContents(token, owner, repo, path = "", branch) {
  const q = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const data = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${q}`,
    token
  );
  // data can be array (dir) or object (single file)
  return Array.isArray(data) ? data : [data];
}

export async function getFileRaw(token, owner, repo, path, branch) {
  const q = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const data = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${q}`,
    token
  );
  return data; // includes .content (base64) and .sha
}

// ---------- Single file create/update/delete (simple cases) ----------

export async function upsertSingleFile(
  token,
  owner,
  repo,
  path,
  base64Content,
  message,
  branch,
  existingSha
) {
  return ghFetch(`${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: base64Content,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });
}

export async function deleteFile(token, owner, repo, path, message, branch, sha) {
  return ghFetch(`${BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, token, {
    method: "DELETE",
    body: JSON.stringify({ message, branch, sha }),
  });
}

export async function deleteFolder(token, owner, repo, folderPath, message, branch) {
  // GitHub Contents API can't delete a folder directly, so we delete every file
  // inside it one by one (recursively) via the Git Trees API.
  const { commitSha, treeSha } = await getBranchHeadTree(token, owner, repo, branch);
  const fullTree = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    token
  );
  const remaining = fullTree.tree.filter(
    (item) => item.type === "blob" && !item.path.startsWith(folderPath + "/") && item.path !== folderPath
  );

  const newTree = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({
      tree: remaining.map((item) => ({
        path: item.path,
        mode: item.mode,
        type: item.type,
        sha: item.sha,
      })),
    }),
  });

  const newCommit = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [commitSha],
    }),
  });

  await ghFetch(`${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return newCommit;
}

// ---------- Multi-file commit (preserves folder structure) ----------

async function getBranchHeadTree(token, owner, repo, branch) {
  const ref = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
  const commit = await ghFetch(
    `${BASE}/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
    token
  );
  return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
}

/**
 * files: [{ path: "folder/sub/file.png", base64: "..." }, ...]
 * path هو المسار الكامل جوه الريبو (بيحافظ على شكل الفولدر زي ما هو في الجهاز)
 */
export async function commitMultipleFiles(
  token,
  owner,
  repo,
  branch,
  files,
  message,
  onProgress
) {
  const { commitSha, treeSha } = await getBranchHeadTree(token, owner, repo, branch);

  const blobs = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const blob = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/blobs`, token, {
      method: "POST",
      body: JSON.stringify({ content: f.base64, encoding: "base64" }),
    });
    blobs.push({
      path: f.path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
    if (onProgress) onProgress(i + 1, files.length);
  }

  const newTree = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({
      base_tree: treeSha,
      tree: blobs,
    }),
  });

  const newCommit = await ghFetch(`${BASE}/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [commitSha],
    }),
  });

  await ghFetch(`${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return newCommit;
}
