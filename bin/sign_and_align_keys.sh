#!/bin/bash

PROJECT=$1
VERSION=$2

if [[ $# -eq 0 ]]; then
    echo "No arguments supplied"
    exit 1
fi

# Sign and release the L+ version
# Make sure the highest supported version has the biggest version code
npx cordova build android --release -- --minSdkVersion=22
# cp platforms/android/app/build/outputs/apk/release/app-release-unsigned.aab platforms/android/app/build/outputs/apk/app-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore ../config_files/production.keystore ./platforms/android/app/build/outputs/bundle/release/app-release.aab androidproductionkey
cp platforms/android/app/build/outputs/bundle/release/app-release.aab $1-build-$2.aab
# ~/Library/Android/sdk/build-tools/30.0.1/zipalign -v 4 platforms/android/app/build/outputs/apk/app-release-signed-unaligned.apk $1-build-$2.apk
