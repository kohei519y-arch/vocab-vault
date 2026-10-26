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

def generate_dev_html():
    """index.html を SSOT (Single Source of Truth) として dev.html を自動生成"""
    index_path = os.path.join(BASE_DIR, "index.html")
    dev_path = os.path.join(BASE_DIR, "dev.html")

    if not os.path.exists(index_path):
        log_fail("index.html not found")
        return False

    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. window.__VV_DEV_MASTER = true; および本番ホスト遮断ガードを注入
    dev_guard = """<script>
    (function() {
      const host = String(window.location?.hostname || '');
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local') || host === '';
      if (!isLocal) {
        document.documentElement.innerHTML = '<body style="padding:40px;font-family:sans-serif;background:#111;color:#eee"><h1>403 Forbidden</h1><p>Developer master mode is strictly disabled on non-local hosts.</p></body>';
        throw new Error('dev.html is blocked on non-local hosts');
      }
    })();
    window.__VV_DEV_MASTER = true;
    // [ゼロ障害保証]"""
    dev_content = content.replace(
        "<script>\n    // [ゼロ障害保証]",
        dev_guard
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

    log("dev.html generated deterministically with production host protection")
    return True

def sync_web_package():
    """ルート資産を vocab-vault-web/ に完全同期（dev.html は本番パッケージから除外）"""
    web_dir = os.path.join(BASE_DIR, "vocab-vault-web")
    os.makedirs(web_dir, exist_ok=True)

    # 同期対象ディレクトリ
    dirs_to_sync = ["js", "css", "icons", "legal", "extension"]
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
        "manifest.json"
    ]
    for fn in files_to_sync:
        src = os.path.join(BASE_DIR, fn)
        dst = os.path.join(web_dir, fn)
        if os.path.exists(src):
            shutil.copy2(src, dst)

    # 過去の dev.html が残っていれば確実に削除
    old_dev = os.path.join(web_dir, "dev.html")
    if os.path.exists(old_dev):
        os.remove(old_dev)

    log("vocab-vault-web/ assets synchronized completely (dev.html excluded)")
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

def update_mac_bundle():
    """Vocab Vault.app および VocabVault-Mac.zip を最新コードでリビルド"""
    update_mac_script = os.path.join(BASE_DIR, "scripts", "update_mac_app.py")
    if os.path.exists(update_mac_script):
        log("Rebuilding Vocab Vault.app & VocabVault-Mac.zip...")
        res = subprocess.run([sys.executable, update_mac_script], cwd=BASE_DIR)
        return res.returncode == 0
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

    # 4. Macネイティブアプリのリビルド・再署名・アーカイブ
    if not update_mac_bundle():
        log_fail("Failed to rebuild Mac bundle.")
        sys.exit(1)

    # 5. 配布パッケージ作成
    if not package_distributions():
        sys.exit(1)

    log_success("Build finished cleanly! All quality gates and distributions synchronized.")

if __name__ == "__main__":
    main()
