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

# 2. Write AppleScript with Single-Instance Enforcement
applescript = r'''set myPath to POSIX path of (path to me)
if myPath ends with "/" then
	set myPath to text 1 thru -2 of myPath
end if

set resDevPath to myPath & "/Contents/Resources/web/dev.html"
set resIndexPath to myPath & "/Contents/Resources/web/index.html"
set parentDir to do shell script "dirname " & quoted form of myPath
set localDevPath to parentDir & "/dev.html"
set localIndexPath to parentDir & "/index.html"

set targetUrl to ""

try
	do shell script "test -f " & quoted form of resDevPath
	set targetUrl to "file://" & resDevPath
on error
	try
		do shell script "test -f " & quoted form of resIndexPath
		set targetUrl to "file://" & resIndexPath
	on error
		try
			do shell script "test -f " & quoted form of localDevPath
			set targetUrl to "file://" & localDevPath
		on error
			try
				do shell script "test -f " & quoted form of localIndexPath
				set targetUrl to "file://" & localIndexPath
			on error
				set targetUrl to "https://kohei519y-arch.github.io/vocab-vault/"
			end try
		end try
	end try
end try

-- 利用可能なブラウザバイナリを判定
set appBin to ""
set appName to ""

set chromeBin to "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
set edgeBin to "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
set braveBin to "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"

try
	do shell script "test -x " & quoted form of chromeBin
	set appBin to chromeBin
	set appName to "Google Chrome"
end try

if appBin is "" then
	try
		do shell script "test -x " & quoted form of edgeBin
		set appBin to edgeBin
		set appName to "Microsoft Edge"
	end try
end if

if appBin is "" then
	try
		do shell script "test -x " & quoted form of braveBin
		set appBin to braveBin
		set appName to "Brave Browser"
	end try
end if

-- 1. すでに該当ブラウザで Vocab Vault のウィンドウが開いている場合は最前面にして終了 (多重起動の完全抑止)
if appName is "Google Chrome" then
	set isRunning to false
	try
		do shell script "pgrep -i 'Google Chrome'"
		set isRunning to true
	end try
	
	if isRunning then
		try
			tell application "Google Chrome"
				repeat with w in windows
					if title of w contains "Vocab Vault" then
						set index of w to 1
						activate
						return
					end if
				end repeat
			end tell
		end try
	end if
else if appName is "Microsoft Edge" then
	try
		set foundEdge to do shell script "osascript -e 'tell application \"Microsoft Edge\" to repeat with w in windows' -e 'if title of w contains \"Vocab Vault\" then' -e 'set index of w to 1' -e 'activate' -e 'return \"FOUND\"' -e 'end if' -e 'end repeat' 2>/dev/null || true"
		if foundEdge contains "FOUND" then return
	end try
else if appName is "Brave Browser" then
	try
		set foundBrave to do shell script "osascript -e 'tell application \"Brave Browser\" to repeat with w in windows' -e 'if title of w contains \"Vocab Vault\" then' -e 'set index of w to 1' -e 'activate' -e 'return \"FOUND\"' -e 'end if' -e 'end repeat' 2>/dev/null || true"
		if foundBrave contains "FOUND" then return
	end try
end if

-- 2. 既存ウィンドウが存在しない場合は、バイナリ直接実行 (--app) によりブラウザ起動中であっても確実に新規独立ウィンドウを開く
if appBin is not "" then
	do shell script quoted form of appBin & " --app=" & quoted form of targetUrl & " --allow-file-access-from-files > /dev/null 2>&1 &"
else
	do shell script "open " & quoted form of targetUrl
end if
'''

script_tmp = "temp_main.applescript"
with open(script_tmp, "w", encoding="utf-8") as f:
    f.write(applescript)

target_scpt = "Vocab Vault.app/Contents/Resources/Scripts/main.scpt"
subprocess.run(["osacompile", "-o", target_scpt, script_tmp], check=True)
if os.path.exists(script_tmp):
    os.remove(script_tmp)

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

# Sync freshly signed Mach-O binary and _CodeSignature back to workspace Vocab Vault.app
for root_d, _, files_d in os.walk("Vocab Vault.app"):
    for fn_d in files_d:
        if fn_d == ".DS_Store" or fn_d.startswith("._"):
            try:
                os.remove(os.path.join(root_d, fn_d))
            except OSError:
                pass

local_applet = os.path.join("Vocab Vault.app", "Contents", "MacOS", "applet")
staged_applet = os.path.join(staged_app, "Contents", "MacOS", "applet")
if os.path.exists(staged_applet):
    shutil.copy2(staged_applet, local_applet)

local_sig = os.path.join("Vocab Vault.app", "Contents", "_CodeSignature")
staged_sig = os.path.join(staged_app, "Contents", "_CodeSignature")
if os.path.exists(staged_sig):
    if os.path.exists(local_sig):
        shutil.rmtree(local_sig)
    shutil.copytree(staged_sig, local_sig)

# Clean up staging dir
shutil.rmtree(staging_dir)

print("Mac standalone app updated, self-contained, cleanly signed, and zipped via /tmp staging!")
