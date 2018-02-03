#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "No arguments supplied"
    exit 1
fi

# Sign and release the L+ version
# Make sure the highest supported version has the biggest version code
cordova build android --release -- --minSdkVersion=21 --gradleArg=-PcdvVersionCode=${1}9
cp platforms/android/build/outputs/apk/release/android-release-unsigned.apk platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/27.0.3/zipalign -v 4 platforms/android/build/outputs/apk/android-L+-release-signed-unaligned.apk emission-L+-build-$1.apk

# Re-add the plugin
cordova plugin add cordova-plugin-crosswalk-webview

# Copy the workaround to make it ready to build with gradle
cp bin/xwalk6-workaround.gradle platforms/android/cordova-plugin-crosswalk-webview
python bin/gradle_workaround.py -a

# Rebuild the entries with crosswalk
cordova build android --release

# Sign and release arm7
cp platforms/android/build/outputs/apk/armv7/release/android-armv7-release-unsigned.apk platforms/android/build/outputs/apk/android-arm7-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-arm7-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/27.0.3/zipalign -v 4 platforms/android/build/outputs/apk/android-arm7-release-signed-unaligned.apk emission-arm7-build-$1.apk
 
# Sign and release x86
cp platforms/android/build/outputs/apk/x86/release/android-x86-release-unsigned.apk platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/27.0.3/zipalign -v 4 platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk emission-x86-build-$1.apk

# Remove the plugin
cordova plugin remove cordova-plugin-crosswalk-webview

# Remove the build workarounds
python bin/gradle_workaround.py -r
rm platforms/android/cordova-plugin-crosswalk-webview/xwalk6-workaround.gradle
