# -*- coding: utf-8 -*-
"""快速部署：使用 GitHub Git Data API 原子化上傳整個目錄。

優點：
- 一次 tree 建立即完整替換遠端內容（自動清除誤傳的 node_modules 等檔案）
- 比逐檔 Contents API 快很多

使用方式（憑證僅由環境變數傳入，切勿寫入檔案）：
  GH_TOKEN=<token> GH_REPO=star-game-hub GH_OWNER=vip-4 python tools/github_pages_deploy_fast.py
"""
import base64
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

API = "https://api.github.com"
OWNER = os.environ.get("GH_OWNER", "")
REPO = os.environ.get("GH_REPO", "star-game-hub")
TOKEN = os.environ.get("GH_TOKEN", "")
ROOT = Path(__file__).resolve().parents[1]
BRANCH = os.environ.get("GH_BRANCH", "main")

# 排除：開發依賴、git、快取
EXCLUDE_DIRS = {"node_modules", ".git", "__pycache__", ".next", "dist", "build"}
EXCLUDE_NAMES = {".DS_Store", "package-lock.json"}


def headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def fail(msg):
    raise SystemExit("部署失敗：" + msg)


def create_blob(path):
    content = base64.b64encode(path.read_bytes()).decode("ascii")
    r = requests.post(
        f"{API}/repos/{OWNER}/{REPO}/git/blobs",
        headers=headers(),
        json={"content": content, "encoding": "base64"},
        timeout=60,
    )
    if r.status_code not in (200, 201):
        fail(f"建立 blob {path.name} 失敗：{r.status_code} {r.text[:200]}")
    return path, r.json()["sha"]


def main():
    global OWNER
    if not TOKEN:
        fail("請設定 GH_TOKEN 環境變數")

    h = headers()

    # 1) 驗證 token 並取得 owner
    me = requests.get(f"{API}/user", headers=h, timeout=30)
    if me.status_code != 200:
        fail(f"Token 驗證失敗：{me.status_code}")
    if not OWNER:
        OWNER = me.json()["login"]

    repo_url = f"{API}/repos/{OWNER}/{REPO}"

    # 2) 確認 repo 存在
    existing = requests.get(repo_url, headers=h, timeout=30)
    if existing.status_code == 404:
        fail(f"Repo {OWNER}/{REPO} 不存在，請先用 github_pages_deploy.py 建立")

    # 3) 收集要上傳的檔案
    files = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT)
        if any(part in EXCLUDE_DIRS for part in rel.parts) or rel.name in EXCLUDE_NAMES:
            continue
        files.append(path)

    print(f"準備上傳 {len(files)} 個檔案（已排除 node_modules 等開發檔案）")

    # 4) 並行建立 blobs
    blobs = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(create_blob, p): p for p in files}
        for fut in as_completed(futures):
            path, sha = fut.result()
            blobs[path] = sha
    print(f"已建立 {len(blobs)} 個 blob")

    # 5) 建立 tree（省略 base_tree → 完整替換，清除遠端多餘檔案）
    tree_entries = []
    for path, sha in blobs.items():
        rel = path.relative_to(ROOT).as_posix()
        tree_entries.append({
            "path": rel,
            "mode": "100644",
            "type": "blob",
            "sha": sha,
        })
    tree_r = requests.post(
        f"{repo_url}/git/trees",
        headers=h,
        json={"tree": tree_entries},
        timeout=60,
    )
    if tree_r.status_code not in (200, 201):
        fail(f"建立 tree 失敗：{tree_r.status_code} {tree_r.text[:300]}")
    tree_sha = tree_r.json()["sha"]

    # 6) 取得目前分支 commit 作為 parent
    ref_r = requests.get(f"{repo_url}/git/ref/heads/{BRANCH}", headers=h, timeout=30)
    parent_sha = ref_r.json()["object"]["sha"] if ref_r.status_code == 200 else None

    commit_payload = {
        "message": "Deploy Star Game Hub — 5 games (Star Shooter added)",
        "tree": tree_sha,
    }
    if parent_sha:
        commit_payload["parents"] = [parent_sha]

    commit_r = requests.post(f"{repo_url}/git/commits", headers=h, json=commit_payload, timeout=60)
    if commit_r.status_code not in (200, 201):
        fail(f"建立 commit 失敗：{commit_r.status_code} {commit_r.text[:300]}")
    new_commit = commit_r.json()["sha"]

    # 7) 更新分支參照
    if parent_sha:
        ref_update = requests.patch(
            f"{repo_url}/git/refs/heads/{BRANCH}",
            headers=h,
            json={"sha": new_commit, "force": False},
            timeout=30,
        )
    else:
        ref_update = requests.post(
            f"{repo_url}/git/refs",
            headers=h,
            json={"ref": f"refs/heads/{BRANCH}", "sha": new_commit},
            timeout=30,
        )
    if ref_update.status_code not in (200, 201):
        fail(f"更新分支失敗：{ref_update.status_code} {ref_update.text[:300]}")

    print("✅ 部署完成")
    print("站台網址: https://%s.github.io/%s/" % (OWNER, REPO))
    print("已清除遠端多餘檔案（含誤傳的 node_modules）")


if __name__ == "__main__":
    main()