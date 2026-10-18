#!/usr/bin/env python3
import os
import subprocess
import shutil

# 1. Bundle web app inside Vocab Vault.app/Contents/Resources/web/
res_dir = "Vocab Vault.app/Contents/Resources/web"
os.makedirs(res_dir, exist_ok=True)

for fn in ["index.html", "dev.html", "manifest.json", "sw.js"]:
    shutil.copy(fn, res_dir)

for folder in ["css", "js", "icons"]:
    dest = os.path.join(res_dir, folder)
    if os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.copytree(folder, dest)

# Sync to vocab-vault-web (Production Web / GitHub Pages PWA)
web_dir = "vocab-vault-web"
if os.path.exists(web_dir):
    for fn in ["index.html", "manifest.json", "sw.js"]:
        shutil.copy(fn, web_dir)
    for folder in ["css", "js", "icons"]:
        dest = os.path.join(web_dir, folder)
        if os.path.exists(dest):
            shutil.rmtree(dest)
        shutil.copytree(folder, dest)
    dev_html_prod = os.path.join(web_dir, "dev.html")
    if os.path.exists(dev_html_prod):
        os.remove(dev_html_prod)

# 2. Compile Native Cocoa WebKit Mach-O Standalone Shell
native_src = "scripts/native_app/main.m"
if not os.path.exists(native_src):
    raise FileNotFoundError(f"Native source not found: {native_src}")

macos_dir = "Vocab Vault.app/Contents/MacOS"
os.makedirs(macos_dir, exist_ok=True)
target_bin = os.path.join(macos_dir, "VocabVault")
applet_bin = os.path.join(macos_dir, "applet")

# SDK 選定
sdk_path = "/Library/Developer/CommandLineTools/SDKs/MacOSX15.sdk"
if not os.path.exists(sdk_path):
    try:
        sdk_path = subprocess.check_output(["xcrun", "--show-sdk-path"], text=True).strip()
    except Exception:
        sdk_path = None

compile_cmd = ["clang", "-O2", "-framework", "Cocoa", "-framework", "WebKit"]
if sdk_path and os.path.exists(sdk_path):
    compile_cmd.extend(["-isysroot", sdk_path])
compile_cmd.extend([native_src, "-o", target_bin])

print(f"Compiling native standalone executable: {' '.join(compile_cmd)}")
subprocess.run(compile_cmd, check=True)
os.chmod(target_bin, 0o755)

# 後方互換性のため applet としても配置
shutil.copyfile(target_bin, applet_bin)
os.chmod(applet_bin, 0o755)

# 3. Stage in /tmp to completely isolate from iCloud fpfs / FinderInfo daemon
staging_dir = "/tmp/vocab_vault_mac_build"
if os.path.exists(staging_dir):
    shutil.rmtree(staging_dir)
os.makedirs(staging_dir, exist_ok=True)

staged_app = os.path.join(staging_dir, "Vocab Vault.app")
subprocess.run(["cp", "-Rf", "Vocab Vault.app", staged_app], check=True)

# Clean and ad-hoc sign in clean staging environment
subprocess.run(
    f"dot_clean -m '{staged_app}'; "
    f"xattr -cr '{staged_app}'; "
    f"codesign --force --deep --sign - '{staged_app}'",
    shell=True,
    check=True
)

# 4. Generate clean VocabVault-Mac.zip from staged app
staged_zip = os.path.join(staging_dir, "VocabVault-Mac.zip")
subprocess.run(["zip", "-r", "-y", staged_zip, "Vocab Vault.app"], cwd=staging_dir, check=True)

if os.path.exists("VocabVault-Mac.zip"):
    os.remove("VocabVault-Mac.zip")
shutil.copyfile(staged_zip, "VocabVault-Mac.zip")
shutil.copyfile(staged_zip, "vocab-vault-web/VocabVault-Mac.zip")

# Generate clean vocab-vault-web.zip
import zipfile
web_zip_path = "vocab-vault-web.zip"
with zipfile.ZipFile(web_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root_w, _, files_w in os.walk("vocab-vault-web"):
        for file_w in files_w:
            if file_w.endswith('.zip') or file_w.startswith('.'):
                continue
            full_w = os.path.join(root_w, file_w)
            rel_w = os.path.relpath(full_w, "vocab-vault-web")
            zf.write(full_w, os.path.join("vocab-vault-web", rel_w))
shutil.copyfile(web_zip_path, os.path.join("vocab-vault-web", web_zip_path))

# Sync freshly signed Mach-O binary and _CodeSignature back to workspace Vocab Vault.app
for root_d, _, files_d in os.walk("Vocab Vault.app"):
    for fn_d in files_d:
        if fn_d == ".DS_Store" or fn_d.startswith("._"):
            try:
                os.remove(os.path.join(root_d, fn_d))
            except OSError:
                pass

for bin_name in ["VocabVault", "applet"]:
    local_b = os.path.join(macos_dir, bin_name)
    staged_b = os.path.join(staged_app, "Contents", "MacOS", bin_name)
    if os.path.exists(staged_b):
        shutil.copy2(staged_b, local_b)

local_sig = os.path.join("Vocab Vault.app", "Contents", "_CodeSignature")
staged_sig = os.path.join(staged_app, "Contents", "_CodeSignature")
if os.path.exists(staged_sig):
    if os.path.exists(local_sig):
        shutil.rmtree(local_sig)
    shutil.copytree(staged_sig, local_sig)

# Clean up staging dir
shutil.rmtree(staging_dir)

print("Mac standalone native app updated, cleanly signed, and zipped via /tmp staging!")
