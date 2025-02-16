# error out if any command fails
set -e

# Setup the development environment
source setup/setup_shared.sh

echo "Configuring the repo for UI development"
./bin/configure_xml_and_json.js serve

echo "Setting up all npm packages"
npm install

# We need to re-copy and re-run to avoid package-lock.json being overwritten
# https://github.com/e-mission/e-mission-phone/pull/1198#issuecomment-2661629587
echo "Re-copy over the package-lock.json and not the other files"
cp package-lock.serve.json package-lock.json

echo "Re-run npm install to install the locked packages"
npm install

echo "Pulling the plugin-specific UIs"
npm run setup-serve

npx cordova prepare
