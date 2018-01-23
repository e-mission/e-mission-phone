#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "No arguments supplied"
    exit 1
fi

# Sign and release the L+ version
cordova build android --release -- --minSdkVersion=21
cp platforms/android/build/outputs/apk/release/android-release-unsigned.apk platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/27.0.3/zipalign -v 4 platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk emission-L+-build-$1.apk

# Re-add the plugin
cordova plugin add cordova-plugin-crosswalk-webview

# Remove the game screen
rm -r www/common
cp www/templates/main.html.nogame www/templates/main.html

# Rebuild the backup generic apk
cordova build android --release -- --gradleArg=-PcdvVersionCode=${1}0

# Sign and release generic pre-L+ version
cp platforms/android/build/outputs/apk/release/android-release-unsigned.apk platforms/android/build/outputs/apk/android-pre-L-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-pre-L-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/27.0.3/zipalign -v 4 platforms/android/build/outputs/apk/android-pre-L-release-signed-unaligned.apk emission-pre-L-build-$1.apk

# Re-remove the plugin
cordova plugin remove cordova-plugin-crosswalk-webview
git checkout HEAD www/common
git checkout www/templates/main.html
