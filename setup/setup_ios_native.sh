# error out if any command fails
set -e

# Setup the development environment
source setup/setup_shared.sh

echo "Installing cocoapods"
export PATH=$RUBY_PATH:$PATH
gem install --no-document --user-install cocoapods -v $COCOAPODS_VERSION

source setup/setup_shared_native.sh
