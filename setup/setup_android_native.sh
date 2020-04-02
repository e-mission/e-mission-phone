echo "Ensure we exit on error"
set -e

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
ANDROID_BUILD_TOOLS_VERSION=27.0.3
MIN_SDK_VERSION=21
TARGET_SDK_VERSION=28

# Setup the development environment
source setup/setup_shared.sh

if [ -z $ANDROID_HOME ];
then
    echo "ANDROID_HOME not set, android SDK not found, exiting"
    exit 1
else
    echo "ANDROID_HOME found at $ANDROID_HOME"
fi

echo "Setting up sdkman"
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh

echo "Setting up gradle using SDKMan"
sdk install gradle 4.1

source setup/setup_shared_native.sh

INSTALLED_COUNT=`npx cordova plugin list | wc -l`
echo "Found $INSTALLED_COUNT plugins, expected 15"
if [ $INSTALLED_COUNT -lt 15 ];
then
    echo "Found $INSTALLED_COUNT plugins, expected 15, retrying" 
    sleep 5
    npx cordova prepare
elif [ $INSTALLED_COUNT -gt 15 ];
then
    echo "Found extra plugins!"
    npx cordova plugin list
    echo "Failing for investigation"
    exit 1
else
    echo "All plugins installed successfully!"
fi
