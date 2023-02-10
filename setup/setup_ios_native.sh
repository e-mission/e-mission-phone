# error out if any command fails
set -e

# Setup the development environment
source setup/setup_shared.sh

# Importing rvm keys
curl -sSL https://rvm.io/mpapis.asc | gpg2 --import -
curl -sSL https://rvm.io/pkuczynski.asc | gpg2 --import -

# Download and install rvm
echo "Installing stable rvm"
curl -sSL https://get.rvm.io | bash -s stable

# Enable rvm
source /Users/kshankar/.rvm/scripts/rvm

# Download and install ruby
echo "Installing ruby $RUBY_VERSION"
rvm install ruby-$RUBY_VERSION

echo "Switching to ruby version $RUBY_VERSION"
rvm use $RUBY_VERSION

export PATH=$RUBY_PATH:$PATH
echo "Installing cocoapods"
gem install --no-document --user-install cocoapods -v $COCOAPODS_VERSION

source setup/setup_shared_native.sh
