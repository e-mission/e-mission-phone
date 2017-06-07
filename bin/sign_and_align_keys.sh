#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "No arguments supplied"
    exit 1
fi

# Sign and release arm7
cp platforms/android/build/outputs/apk/android-armv7-release-unsigned.apk platforms/android/build/outputs/apk/android-armv7-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-armv7-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/25.0.2/zipalign -v 4 platforms/android/build/outputs/apk/android-armv7-release-signed-unaligned.apk emission-armv7-build-$1.apk

# Sign and release x86
cp platforms/android/build/outputs/apk/android-x86-release-unsigned.apk platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/25.0.2/zipalign -v 4 platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk emission-x86-build-$1.apk

# Remove the plugin, sign and release general
ionic plugin remove cordova-plugin-crosswalk-webview
ionic build android --release -- --minSdkVersion=21
cp platforms/android/build/outputs/apk/android-release-unsigned.apk platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/25.0.2/zipalign -v 4 platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk emission-L+-build-$1.apk

# Re-add the plugin
ionic plugin add cordova-plugin-crosswalk-webview
