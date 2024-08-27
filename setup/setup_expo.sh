# error out if any command fails
set -e

# Setup the development environment
source setup/setup_shared.sh

echo "Configuring the repo for UI development"
./bin/configure_xml_and_json.js expo

echo "Setting up all npm packages"
npm install
