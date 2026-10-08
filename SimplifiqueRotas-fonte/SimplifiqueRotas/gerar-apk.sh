#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
: "${GRADLE_BIN:=gradle}"
"$GRADLE_BIN" :app:assembleRelease :app:lintRelease
printf "\nAPK: app/build/outputs/apk/release/app-release.apk\n"
