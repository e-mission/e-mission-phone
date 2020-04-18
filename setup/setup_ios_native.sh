# error out if any command fails
set -e

COCOAPODS_VERSION=1.9.1
EXPECTED_PLUGIN_COUNT=15

# Setup the development environment
source setup/setup_shared.sh

echo "Installing cocoapods"
export PATH=~/.gem/ruby/2.6.0/bin:$PATH
gem install --no-document --user-install cocoapods -v $COCOAPODS_VERSION

cp setup/GoogleService-Info.fake.for_ci.plist setup/GoogleService-Info.plist

source setup/setup_shared_native.sh
