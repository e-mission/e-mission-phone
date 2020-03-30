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
