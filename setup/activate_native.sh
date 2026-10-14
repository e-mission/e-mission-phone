set -a
source setup/dependencies.env
set +a

# Do not set errexit in the caller's shell. Activation is meant to prepare the
# environment for interactive use without turning the user's terminal into a
# fail-fast shell for unrelated commands.
echo "Activating nvm"

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

echo "Using version $NODE_VERSION"
nvm use $NODE_VERSION

echo "Adding cocoapods to the path"
export PATH=$RUBY_PATH:$PATH

if [ ! -d "$ANDROID_HOME" ];
then
    echo "Android SDK not found at $ANDROID_HOME"
    return 1
else
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    echo "ANDROID_HOME = $ANDROID_HOME; ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
fi

echo "Activating sdkman, and by default, gradle"
source ~/.sdkman/bin/sdkman-init.sh

echo "Ensuring that we use the most recent version of the command line tools"
export PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/emulator:$PATH
