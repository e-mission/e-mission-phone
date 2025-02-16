echo "Ensure we exit on error"
set -e

source setup/setup_shared.sh


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
        WORKING_DIR=$HOMEBREW_PREFIX
    fi
fi

CURR_RUBY_VERSION=`ruby --version | cut -d ' ' -f 2 | cut -d '.' -f 1-2`
echo "Found ruby version "$CURR_RUBY_VERSION

if [ $CURR_RUBY_VERSION == $RUBY_VERSION ]; then
    echo "Found ruby version "$CURR_RUBY_VERSION" expected "$RUBY_VERSION" no need to upgrade"
else
    echo "Required ruby version not found, attempting to install through brew"
    if [ -x "${WORKING_DIR}/bin/brew" ]; then
        echo "Found brew installation with version" ` brew --version`
        echo "Installing ruby version to brew" $RUBY_VERSION
        brew install ruby@$RUBY_VERSION
    else
        echo "No brew installation found"
        exit 1
    fi
fi

echo "Adding $RUBY_PATH to the path before the install"
export PATH=$RUBY_PATH:$PATH

echo "Installing cocoapods"
${WORKING_DIR}/opt/ruby@$RUBY_VERSION/bin/gem install --no-document --user-install cocoapods -v $COCOAPODS_VERSION


# we can build android on both ubuntu and OSX
# should try both since there may be subtle differences
PLATFORM=`uname -a`

# both of these have java on Github Actions
# but may not in docker, for example
# should check for the existence of java and die if it doesn't exist
echo "Checking for java in the path"
JAVA_VERSION=`javac -version`
echo "Found java in the path with version $JAVA_VERSION"

echo "Setting up SDK environment"
MIN_SDK_VERSION=21
TARGET_SDK_VERSION=28

if [ -z $ANDROID_HOME ] && [ -z $ANDROID_SDK_ROOT ];
then
    echo "ANDROID_HOME and ANDROID_SDK_ROOT not set, android SDK not found, exiting"
    exit 1
else
    echo "ANDROID_HOME = $ANDROID_HOME; ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
fi

echo "Setting up sdkman"
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh

CURR_GRADLE_VER=`sdk current gradle | cut -d " " -f 4 | xargs`

echo "CURR_GRADLE_VER = '$CURR_GRADLE_VER', expected $GRADLE_VERSION"

if [[ $CURR_GRADLE_VER == $GRADLE_VERSION ]]; then
    echo "Already have gradle version $GRADLE_VERSION"
else
    echo "Setting up gradle using SDKMan"
    sdk install gradle $GRADLE_VERSION
fi

./bin/configure_xml_and_json.js cordovabuild

echo "Copying fake FCM configurations for android and iOS"
cp setup/GoogleService-Info.fake.for_ci.plist GoogleService-Info.plist
cp setup/google-services.fake.for_ci.json google-services.json

echo "Setting up all npm packages"
npm install

# We need to re-copy and re-run to avoid package-lock.json being overwritten
# https://github.com/e-mission/e-mission-phone/pull/1198#issuecomment-2661629587
echo "Copy over the package-lock.json but not the other files"
cp package-lock.cordovabuild.json package-lock.json

echo "Re-run npm install to install the locked packages"
npm install

# By default, node doesn't fail if any of the steps fail. This makes it hard to
# use in a CI environment, and leads to people reporting the node error rather
# than the underlying error. One solution is to pass in a command line argument to node
# to turn off that behavior. However, the cordova script automatically invokes node
# and I don't see a .noderc to pass in the config option for all runs
# So for now, I am going to hack this by adding the command line argument to
# the cordova script. If anybody has a better option, they are welcome to share
# it with us!
echo "hack to make the local cordova fail on error"
sed -i -e "s|/usr/bin/env node|/usr/bin/env node --unhandled-rejections=strict|" node_modules/cordova/bin/cordova

npx cordova prepare$PLATFORMS

EXPECTED_COUNT=26
INSTALLED_COUNT=`npx cordova plugin list | wc -l`
echo "Found $INSTALLED_COUNT plugins, expected $EXPECTED_COUNT"
if [ $INSTALLED_COUNT -lt $EXPECTED_COUNT ];
then
    echo "Found $INSTALLED_COUNT plugins, expected $EXPECTED_COUNT, retrying" 
    sleep 5
    npx cordova prepare$PLATFORMS
elif [ $INSTALLED_COUNT -gt $EXPECTED_COUNT ];
then
    echo "Found extra plugins!"
    npx cordova plugin list
    echo "Failing for investigation"
    exit 1
else
    echo "All plugins installed successfully!"
fi

