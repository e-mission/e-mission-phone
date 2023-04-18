# Setup the development environment
source setup/activate_shared.sh

echo "Adding cocoapods to the path"
export PATH=$RUBY_PATH:$PATH

echo "Verifying $ANDROID_HOME or $ANDROID_SDK_ROOT is set"
if [ -z $ANDROID_HOME ] && [ -z $ANDROID_SDK_ROOT ];
then
    echo "ANDROID_HOME and ANDROID_SDK_ROOT not set, android SDK not found"
fi

echo "Activating sdkman, and by default, gradle"
source ~/.sdkman/bin/sdkman-init.sh

echo "Ensuring that we use the most recent version of the command line tools"
export PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/emulator:$PATH

echo "Configuring the repo for building native code"
./bin/configure_xml_and_json.js cordovabuild
