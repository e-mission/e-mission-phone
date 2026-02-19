#!/bin/bash

PROJECT=$1
VERSION=$2

pushd platforms/ios/build/emulator
zip -o ../../../../$PROJECT-build-$VERSION.app.zip -r OpenPATH.app
popd
