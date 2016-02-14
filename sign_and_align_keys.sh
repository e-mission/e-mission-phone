#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "No arguments supplied"
    exit 1
fi

cp platforms/android/build/outputs/apk/android-armv7-release-unsigned.apk platforms/android/build/outputs/apk/android-armv7-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-armv7-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/22.0.1/zipalign -v 4 platforms/android/build/outputs/apk/android-armv7-release-signed-unaligned.apk emission-armv7-build-$1.apk

cp platforms/android/build/outputs/apk/android-x86-release-unsigned.apk platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Safety_Infrastructure/MovesConnect/production.keystore ./platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk androidproductionkey
~/Library/Android/sdk/build-tools/22.0.1/zipalign -v 4 platforms/android/build/outputs/apk/android-x86-release-signed-unaligned.apk emission-x86-build-$1.apk
