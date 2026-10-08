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

# 2. Write AppleScript
applescript = '''set myPath to POSIX path of (path to me)
set resPath to myPath & "Contents/Resources/web/dev.html"
set parentDir to do shell script "dirname " & quoted form of myPath
set localDevPath to parentDir & "/dev.html"

set targetUrl to ""

try
	do shell script "test -f " & quoted form of resPath
	set targetUrl to "file://" & resPath
on error
	try
		do shell script "test -f " & quoted form of localDevPath
		set targetUrl to "file://" & localDevPath
	on error
		set targetUrl to "https://kohei519y-arch.github.io/vocab-vault/"
	end try
end try

set chromePath to "/Applications/Google Chrome.app"
set edgePath to "/Applications/Microsoft Edge.app"
set bravePath to "/Applications/Brave Browser.app"

set hasChrome to false
set hasEdge to false
set hasBrave to false

try
	do shell script "test -d " & quoted form of chromePath
	set hasChrome to true
end try

if not hasChrome then
	try
		do shell script "test -d " & quoted form of edgePath
		set hasEdge to true
	end try
end if

if not hasChrome and not hasEdge then
	try
		do shell script "test -d " & quoted form of bravePath
		set hasBrave to true
	end try
end if

if hasChrome then
	do shell script "open -n -a 'Google Chrome' --args --app=" & quoted form of targetUrl & " --allow-file-access-from-files"
else if hasEdge then
	do shell script "open -n -a 'Microsoft Edge' --args --app=" & quoted form of targetUrl
else if hasBrave then
	do shell script "open -n -a 'Brave Browser' --args --app=" & quoted form of targetUrl
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

# 3. Clean up extended attributes and re-sign with ad-hoc signature
subprocess.run(["xattr", "-cr", "Vocab Vault.app"], check=True)
subprocess.run(["codesign", "--force", "--deep", "--sign", "-", "Vocab Vault.app"], check=True)

# 4. Re-generate VocabVault-Mac.zip
if os.path.exists("VocabVault-Mac.zip"):
    os.remove("VocabVault-Mac.zip")

subprocess.run(["zip", "-r", "-y", "VocabVault-Mac.zip", "Vocab Vault.app"], check=True)
shutil.copyfile("VocabVault-Mac.zip", "vocab-vault-web/VocabVault-Mac.zip")

print("Mac standalone app updated, self-contained, cleanly signed, and zipped!")
