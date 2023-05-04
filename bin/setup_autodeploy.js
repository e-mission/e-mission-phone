#!/bin/bash

SRC_DIR="setup/autoreload"
INSTALL_DIR="node_modules/connect-phonegap"

echo "About to copy files from $SRC_DIR to $INSTALL_DIR"
cp $SRC_DIR/middleware.js $INSTALL_DIR/lib/middleware.js
cp $SRC_DIR/nocache.js $INSTALL_DIR/lib/middleware/nocache.js
cp $SRC_DIR/lib_autoreload.js $INSTALL_DIR/lib/middleware/autoreload.js
cp $SRC_DIR/res_autoreload.js $INSTALL_DIR/res/middleware/autoreload.js
cp $SRC_DIR/macos-index.js $INSTALL_DIR/../macos-release/index.js
echo "Finished copying files from $SRC_DIR to $INSTALL_DIR"
