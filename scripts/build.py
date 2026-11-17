#!/usr/bin/env python3
"""
Vocab Vault — Master Build & Integrity Pipeline (scripts/build.py)
一貫したビルド、HTML同期、Webパッケージ同期、Macアプリ再ビルド、テスト実行を自動化
"""

import os
import sys
import shutil
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def log(msg):
    print(f"\033[36m[BUILD]\033[0m {msg}")

def log_success(msg):
    print(f"\033[32m[BUILD SUCCESS]\033[0m {msg}")

def log_fail(msg):
    print(f"\033[31m[BUILD ERROR]\033[0m {msg}")

def bundle_js():
    """esbuild を用いて src/ の ESM ソースを dist/app.bundle.js と遅延チャンクへバンドル"""
    src_entry = os.path.join(BASE_DIR, "src", "entry.js")
    if not os.path.exists(src_entry):
        log("src/entry.js not found; skipping esbuild step")
        return True

    local_esbuild = os.path.join(BASE_DIR, "node_modules", ".bin", "esbuild")
    esbuild_cmd = [local_esbuild] if os.path.exists(local_esbuild) else ["npx", "esbuild"]

    dist_dir = os.path.join(BASE_DIR, "dist")
    chunks_dir = os.path.join(dist_dir, "chunks")
    if os.path.exists(chunks_dir):
        shutil.rmtree(chunks_dir)
    os.makedirs(chunks_dir, exist_ok=True)

    # 1. Core bundle (dist/app.bundle.js)
    res1 = subprocess.run(
        esbuild_cmd + [
            src_entry, "--bundle", "--format=iife", "--target=es2022", "--minify",
            "--outfile=" + os.path.join(dist_dir, "app.bundle.js")
        ],
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
    )
    if res1.returncode != 0:
        log_fail(f"esbuild app.bundle.js failed:\n{res1.stderr}")
        return False

    # 2. Dev host guard bundle (dist/dev_guard.js)
    dev_guard_src = os.path.join(BASE_DIR, "src", "dev_guard.js")
    if os.path.exists(dev_guard_src):
        res2 = subprocess.run(
            esbuild_cmd + [
                dev_guard_src, "--bundle", "--format=iife", "--target=es2022", "--minify",
                "--outfile=" + os.path.join(dist_dir, "dev_guard.js")
            ],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
        )
        if res2.returncode != 0:
            log_fail(f"esbuild dev_guard.js failed:\n{res2.stderr}")
            return False

    # 3. Lazy chunks (dist/chunks/*.js)
    chunk_src_dir = os.path.join(BASE_DIR, "src", "chunks")
    chunk_files = sorted(
        os.path.join(chunk_src_dir, fn)
        for fn in os.listdir(chunk_src_dir)
        if fn.endswith(".js")
    ) if os.path.exists(chunk_src_dir) else []

    if chunk_files:
        res3 = subprocess.run(
            esbuild_cmd + chunk_files + [
                "--bundle", "--format=iife", "--target=es2022", "--minify",
                "--outdir=" + chunks_dir
            ],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
        )
        if res3.returncode != 0:
            log_fail(f"esbuild lazy chunks failed:\n{res3.stderr}")
            return False

    log(f"Bundled dist/app.bundle.js + dist/dev_guard.js + {len(chunk_files)} lazy chunks via esbuild")
    return True

def generate_dev_html():
    """index.html を SSOT (Single Source of Truth) として dev.html を自動生成"""
    index_path = os.path.join(BASE_DIR, "index.html")
    dev_path = os.path.join(BASE_DIR, "dev.html")

    if not os.path.exists(index_path):
        log_fail("index.html not found")
        return False

    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. dist/dev_guard.js 経由で非ローカルホスト遮断 & DEV MASTER フラグを設定（インラインスクリプト不要）
    dev_guard_tag = '  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n  <script src="dist/dev_guard.js"></script>'
    dev_content = content.replace(
        '  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
        dev_guard_tag,
        1
    )

    # 2. DEV MASTER バッジとクォータ無制限表示を注入
    target_tab_acts = '<div class="tab-acts" id="tabActs">\n          <span id="storageWarnBanner"'
    dev_tab_acts = (
        '<div class="tab-acts" id="tabActs">\n'
        '          <span class="badge ok" style="background:#7c3aed;color:#fff;font-weight:700;border:none;letter-spacing:0.5px">DEV MASTER (全機能無制限)</span>\n'
        '          <span id="storageWarnBanner"'
    )
    dev_content = dev_content.replace(target_tab_acts, dev_tab_acts)

    dev_content = dev_content.replace(
        '>AI残: 5/5語</span>',
        '>AI生成: 無制限</span>'
    )

    with open(dev_path, "w", encoding="utf-8") as f:
        f.write(dev_content)

    log("dev.html generated deterministically with production host protection")
    return True

def sync_web_package():
    """ルート資産を vocab-vault-web/ に完全同期（dev.html は本番パッケージから除外）"""
    web_dir = os.path.join(BASE_DIR, "vocab-vault-web")
    os.makedirs(web_dir, exist_ok=True)

    # 同期対象ディレクトリ
    dirs_to_sync = ["css", "icons", "legal", "extension", "dist", ".well-known"]
    for d in dirs_to_sync:
        src = os.path.join(BASE_DIR, d)
        dst = os.path.join(web_dir, d)
        if os.path.exists(src):
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)

    # 同期対象ファイル（dev.html は意図的に除外して本番流出を防止）
    files_to_sync = [
        "index.html",
        "sw.js",
        "manifest.json",
        "robots.txt",
        "sitemap.xml"
    ]
    for fn in files_to_sync:
        src = os.path.join(BASE_DIR, fn)
        dst = os.path.join(web_dir, fn)
        if os.path.exists(src):
            shutil.copy2(src, dst)

    # 過去の dev.html / dev_guard.js / レガシー js/ が残っていれば確実に削除
    for stale_path in [
        os.path.join(web_dir, "dev.html"),
        os.path.join(web_dir, "dist", "dev_guard.js"),
        os.path.join(web_dir, "js"),
    ]:
        if os.path.isdir(stale_path):
            shutil.rmtree(stale_path)
        elif os.path.exists(stale_path):
            os.remove(stale_path)

    log("vocab-vault-web/ assets synchronized completely (dev.html excluded)")
    return True

def sync_mac_web_bundle(include_dev_mac=False):
    """ルート資産を Vocab Vault.app/Contents/Resources/web/ に同期（標準は本番用 index.html のみ、--dev-mac 時のみ dev.html 同梱）"""
    res_dir = os.path.join(BASE_DIR, "Vocab Vault.app", "Contents", "Resources", "web")
    if not os.path.exists(os.path.join(BASE_DIR, "Vocab Vault.app")):
        return True
    os.makedirs(res_dir, exist_ok=True)

    for d in ["css", "icons", "legal", "dist"]:
        src = os.path.join(BASE_DIR, d)
        dst = os.path.join(res_dir, d)
        if os.path.exists(src):
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)

    mac_legacy_js = os.path.join(res_dir, "js")
    if os.path.exists(mac_legacy_js):
        shutil.rmtree(mac_legacy_js)

    files_to_copy = ["index.html", "manifest.json", "sw.js"]
    if include_dev_mac:
        files_to_copy.append("dev.html")
    for fn in files_to_copy:
        src = os.path.join(BASE_DIR, fn)
        dst = os.path.join(res_dir, fn)
        if os.path.exists(src):
            shutil.copy2(src, dst)

    mac_dev = os.path.join(res_dir, "dev.html")
    mac_guard = os.path.join(res_dir, "dist", "dev_guard.js")
    if not include_dev_mac:
        if os.path.exists(mac_dev):
            os.remove(mac_dev)
        if os.path.exists(mac_guard):
            os.remove(mac_guard)

    mode_label = "DEV (--dev-mac)" if include_dev_mac else "RELEASE (index.html only)"
    log(f"Vocab Vault.app/Contents/Resources/web/ synchronized [{mode_label}]")
    return True

def package_distributions():
    """vocab-vault-web.zip をパッケージング"""
    web_zip = os.path.join(BASE_DIR, "vocab-vault-web.zip")
    web_in_web_zip = os.path.join(BASE_DIR, "vocab-vault-web", "vocab-vault-web.zip")
    if os.path.exists(web_zip):
        os.remove(web_zip)
    if os.path.exists(web_in_web_zip):
        os.remove(web_in_web_zip)

    # Macアプリの同期コピー
    mac_zip = os.path.join(BASE_DIR, "VocabVault-Mac.zip")
    web_mac_zip = os.path.join(BASE_DIR, "vocab-vault-web", "VocabVault-Mac.zip")
    if os.path.exists(mac_zip):
        shutil.copy2(mac_zip, web_mac_zip)

    res = subprocess.run(["zip", "-rq", "vocab-vault-web.zip", "vocab-vault-web/"], cwd=BASE_DIR)
    if res.returncode != 0:
        log_fail("Failed to zip vocab-vault-web.zip")
        return False

    if os.path.exists(web_zip):
        shutil.copy2(web_zip, web_in_web_zip)

    log("Distribution packages updated")
    return True

def update_mac_bundle(include_dev_mac=False):
    """Vocab Vault.app および VocabVault-Mac.zip を最新コードでリビルド"""
    update_mac_script = os.path.join(BASE_DIR, "scripts", "update_mac_app.py")
    if os.path.exists(update_mac_script):
        log("Rebuilding Vocab Vault.app & VocabVault-Mac.zip...")
        cmd = [sys.executable, update_mac_script]
        if include_dev_mac:
            cmd.append("--dev-mac")
        res = subprocess.run(cmd, cwd=BASE_DIR)
        return res.returncode == 0
    return True

def run_tests():
    """全テストスイートの実行"""
    test_script = os.path.join(BASE_DIR, "scripts", "run_all_tests.py")
    res = subprocess.run([sys.executable, test_script], cwd=BASE_DIR)
    return res.returncode == 0

def main():
    sync_only = "--sync-only" in sys.argv[1:]
    include_dev_mac = "--dev-mac" in sys.argv[1:]
    print("==================================================")
    print(" Vocab Vault Automated Master Build Pipeline")
    print("==================================================")

    # 0. esbuild ESM -> dist/app.bundle.js & lazy chunks
    if not bundle_js():
        sys.exit(1)

    # 1. dev.html 生成
    if not generate_dev_html():
        sys.exit(1)

    # 2. vocab-vault-web 同期
    if not sync_web_package():
        sys.exit(1)

    # 2b. Vocab Vault.app Web リソース同期
    if not sync_mac_web_bundle(include_dev_mac=include_dev_mac):
        sys.exit(1)

    if sync_only:
        log_success("Sync-only completed! Root, dev.html, vocab-vault-web, and Vocab Vault.app are synchronized.")
        sys.exit(0)

    # 3. テスト実行
    log("Running automated quality tests...")
    if not run_tests():
        log_fail("Build halted due to test failures.")
        sys.exit(1)

    # 4. Macネイティブアプリのリビルド・再署名・アーカイブ
    if not update_mac_bundle(include_dev_mac=include_dev_mac):
        log_fail("Failed to rebuild Mac bundle.")
        sys.exit(1)

    # 5. 配布パッケージ作成
    if not package_distributions():
        sys.exit(1)

    log_success("Build finished cleanly! All quality gates and distributions synchronized.")

if __name__ == "__main__":
    main()
