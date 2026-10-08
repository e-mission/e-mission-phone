echo "Ensure we exit on error"
set -e

source setup/teardown_dependencies.sh

echo "Uninstalling cocoapods version $COCOAPODS_VERSION"
gem uninstall cocoapods -v "$COCOAPODS_VERSION" -x || true

echo "Removing sdkman"
rm -rf ~/.sdkman || true

echo "Restoring the stock cordova node invocation"
if [ -f node_modules/cordova/bin/cordova ]; then
    sed -i -e "s|/usr/bin/env node --unhandled-rejections=strict|/usr/bin/env node|" node_modules/cordova/bin/cordova || true
fi

echo "Removing all plugins and platforms to make a fresh start"
rm -rf plugins
rm -rf platforms
