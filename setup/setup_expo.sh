# error out if any command fails
set -e

# Setup the development environment
source setup/setup_shared.sh

echo "Setting up all npm packages"
npm install
