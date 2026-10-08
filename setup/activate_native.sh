echo "Ensure we exit on error"
set -e

source setup/setup_dependencies.sh

echo "Activating nvm"

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

echo "Using version $NODE_VERSION"
nvm use $NODE_VERSION

echo "Adding cocoapods to the path"
export PATH=$RUBY_PATH:$PATH

if [ -z "$ANDROID_HOME" ];
then
    echo "ANDROID_HOME not set, android SDK not found, exiting"
    exit 1
else
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    echo "ANDROID_HOME = $ANDROID_HOME; ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
fi

echo "Activating sdkman, and by default, gradle"
source ~/.sdkman/bin/sdkman-init.sh

echo "Ensuring that we use the most recent version of the command line tools"
export PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/emulator:$PATH
