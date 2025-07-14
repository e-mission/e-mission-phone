# error out if any command fails
set -e

# Setup the development environment
source setup/setup_shared.sh

echo "Configuring the repo for UI development"
./bin/configure_xml_and_json.js serve

echo "Setting up all npm packages"
npm install

echo "Set up autodeploy"
./bin/setup_autodeploy.js

npx cordova prepare
