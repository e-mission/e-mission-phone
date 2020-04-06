#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "No arguments supplied"
    exit 1
fi

# Sign and release the L+ version
# Make sure the highest supported version has the biggest version code
npx cordova build android --release -- --minSdkVersion=21
cp platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk platforms/android/app/build/outputs/apk/app-L+-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/app/build/outputs/apk/app-L+-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/27.0.3/zipalign -v 4 platforms/android/app/build/outputs/apk/app-L+-release-signed-unaligned.apk cv-19-track-L+-build-$1.apk
