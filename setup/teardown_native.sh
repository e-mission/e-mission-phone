echo "Ensure we exit on error"
set -e

source setup/teardown_dependencies.sh

echo "Uninstalling cocoapods version $COCOAPODS_VERSION"
COCOAPODS_GEM_BIN="$(brew --prefix "ruby@$RUBY_VERSION")/bin/gem"
if [ -x "$COCOAPODS_GEM_BIN" ]; then
    "$COCOAPODS_GEM_BIN" uninstall cocoapods -v "$COCOAPODS_VERSION" -x || true
fi

echo "Removing the SDKMAN-managed Gradle install used by this project"
if [ -f ~/.sdkman/bin/sdkman-init.sh ]; then
    . ~/.sdkman/bin/sdkman-init.sh
    sdk uninstall gradle "$GRADLE_VERSION" || true
fi

echo "Removing all plugins and platforms to make a fresh start"
rm -rf plugins
rm -rf platforms
