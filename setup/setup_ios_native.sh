# error out if any command fails
set -e

# Setup the development environment
source setup/setup_shared.sh

OSX_MAJOR_VERSION=`sw_vers | grep ProductVersion | cut -d ':' -f 2 | cut -d '.' -f 1`
echo "Found OSX major version" $OSX_MAJOR_VERSION

# The Homebrew pac-man is installed in different locations, depending on whether the processor
# is an Intel or Apple Silicone chip.  Intel uses x86_64, Apple chips are amd64, so we can
# check the chip type using these hardware platforms.
CHIP_ARC=`uname -m`
INTEL="x86_64"
APPLE_SILICONE="arm64"
WORKING_DIR=""

if [ $CHIP_ARC == $INTEL ]; then
    echo "Found "$INTEL" chip"
    WORKING_DIR="/usr/local/"
else 
    if [ $CHIP_ARC == $APPLE_SILICONE ]; then
        echo "Found "$APPLE_SILICONE" chip"
        WORKING_DIR="/opt/homebrew/"
    fi
fi

CURR_RUBY_VERSION=`ruby --version | cut -d ' ' -f 2 | cut -d '.' -f 1-2`
echo "Found ruby version "$CURR_RUBY_VERSION

if [ $CURR_RUBY_VERSION == $RUBY_VERSION ]; then
    echo "Found ruby version "$CURR_RUBY_VERSION" expected "$RUBY_VERSION" no need to upgrade"
else
    if [ -x "${WORKING_DIR}/bin/brew" ]; then 
        echo "Found brew installation with version" ` brew --version`
        echo "Installing ruby version to brew" $RUBY_VERSION
        brew install ruby@$RUBY_VERSION
    else
        if [ $OSX_MAJOR_VERSION -ge $OSX_EXP_VERSION ]; then
            echo "No brew installation found, but OSX major version "$OSX_MAJOR_VERSION" and expected version "$OSX_EXP_VERSION" so CocoaPods should work"
        else
            echo "No brew installation found, but OSX major version "$OSX_MAJOR_VERSION" != expected version "$OSX_EXP_VERSION" CocoaPods install will likely fail"
            echo "Found ruby version "`ruby --version`
            exit 1
        fi
    fi
fi

echo "Adding $RUBY_PATH to the path before the install"
export PATH=$RUBY_PATH:$PATH

echo "Installing cocoapods"
${WORKING_DIR}/opt/ruby@$RUBY_VERSION/bin/gem install --no-document --user-install cocoapods -v $COCOAPODS_VERSION

source setup/setup_shared_native.sh
