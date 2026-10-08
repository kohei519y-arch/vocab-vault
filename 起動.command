#!/bin/bash
# Vocab Vault Launcher & Gatekeeper Unblocker
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$DIR/Vocab Vault.app"

# Remove quarantine attribute that causes "App is damaged" dialog
xattr -cr "$APP_PATH" 2>/dev/null

# Launch the app
open "$APP_PATH"
