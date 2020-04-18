# error out if any command fails
set -e

COCOAPODS_VERSION=1.9.1
EXPECTED_PLUGIN_COUNT=15

# Setup the development environment
source setup/setup_shared.sh

echo "Installing cocoapods"
export PATH=~/.gem/ruby/2.6.0/bin:$PATH
gem install --no-document --user-install cocoapods -v $COCOAPODS_VERSION

source setup/setup_shared_native.sh
