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
    print(f"\033[32m✔ [BUILD SUCCESS]\033[0m {msg}")

def log_fail(msg):
    print(f"\033[31m✘ [BUILD ERROR]\033[0m {msg}")

def generate_dev_html():
    """index.html を SSOT (Single Source of Truth) として dev.html を自動生成"""
    index_path = os.path.join(BASE_DIR, "index.html")
    dev_path = os.path.join(BASE_DIR, "dev.html")

    if not os.path.exists(index_path):
        log_fail("index.html not found")
        return False

    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. window.__VV_DEV_MASTER = true; を注入
    dev_content = content.replace(
        "<script>\n    // [ゼロ障害保証]",
        "<script>\n    window.__VV_DEV_MASTER = true;\n    // [ゼロ障害保証]"
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
        '<span id="aiQuotaBadge" class="badge ok" style="cursor:pointer" onclick="openUpsellModal()" title="本日のAI新規生成クォータ">AI残: 5/5語</span>',
        '<span id="aiQuotaBadge" class="badge ok" style="cursor:pointer" onclick="openUpsellModal()" title="本日のAI新規生成クォータ">AI生成: 無制限</span>'
    )

    with open(dev_path, "w", encoding="utf-8") as f:
        f.write(dev_content)

    log("dev.html generated deterministically from index.html (Single Source of Truth)")
    return True

def sync_web_package():
    """ルート資産を vocab-vault-web/ に完全同期"""
    web_dir = os.path.join(BASE_DIR, "vocab-vault-web")
    os.makedirs(web_dir, exist_ok=True)

    # 同期対象ディレクトリ
    dirs_to_sync = ["js", "css", "icons"]
    for d in dirs_to_sync:
        src = os.path.join(BASE_DIR, d)
        dst = os.path.join(web_dir, d)
        if os.path.exists(src):
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)

    # 同期対象ファイル
    files_to_sync = [
        "index.html",
        "dev.html",
        "sw.js",
        "manifest.json"
    ]
    for fn in files_to_sync:
        src = os.path.join(BASE_DIR, fn)
        dst = os.path.join(web_dir, fn)
        if os.path.exists(src):
            shutil.copy2(src, dst)

    log("vocab-vault-web/ assets synchronized completely")
    return True

def package_distributions():
    """vocab-vault-web.zip をパッケージング"""
    res = subprocess.run(["zip", "-rq", "vocab-vault-web.zip", "vocab-vault-web/"], cwd=BASE_DIR)
    if res.returncode != 0:
        log_fail("Failed to zip vocab-vault-web.zip")
        return False

    # Macアプリの同期コピー
    mac_zip = os.path.join(BASE_DIR, "VocabVault-Mac.zip")
    web_mac_zip = os.path.join(BASE_DIR, "vocab-vault-web", "VocabVault-Mac.zip")
    if os.path.exists(mac_zip):
        shutil.copy2(mac_zip, web_mac_zip)

    web_zip = os.path.join(BASE_DIR, "vocab-vault-web.zip")
    web_in_web_zip = os.path.join(BASE_DIR, "vocab-vault-web", "vocab-vault-web.zip")
    if os.path.exists(web_zip):
        shutil.copy2(web_zip, web_in_web_zip)

    log("Distribution packages updated")
    return True

def run_tests():
    """全テストスイートの実行"""
    test_script = os.path.join(BASE_DIR, "scripts", "run_all_tests.py")
    res = subprocess.run([sys.executable, test_script], cwd=BASE_DIR)
    return res.returncode == 0

def main():
    print("==================================================")
    print(" Vocab Vault Automated Master Build Pipeline")
    print("==================================================")

    # 1. dev.html 生成
    if not generate_dev_html():
        sys.exit(1)

    # 2. vocab-vault-web 同期
    if not sync_web_package():
        sys.exit(1)

    # 3. テスト実行
    log("Running automated quality tests...")
    if not run_tests():
        log_fail("Build halted due to test failures.")
        sys.exit(1)

    # 4. 配布パッケージ作成
    if not package_distributions():
        sys.exit(1)

    log_success("Build finished cleanly! All quality gates and distributions synchronized.")

if __name__ == "__main__":
    main()
