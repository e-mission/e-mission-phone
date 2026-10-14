set -a
source setup/dependencies.env
set +a

echo "Ensure we exit on error"
set -e

TOOLS_ZIP_FILENAME=commandlinetools-mac-${TOOLS_VERSION}_latest.zip
echo "Installing command line tools from $TOOLS_ZIP_FILENAME"


if [ -z "$ANDROID_HOME" ];
then
    echo "ANDROID_HOME not set, android SDK not found, exiting"
    exit 1
else
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    echo "ANDROID_HOME = $ANDROID_HOME; ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
fi

echo "Downloading the command line tools for mac"
curl -o /tmp/$TOOLS_ZIP_FILENAME https://dl.google.com/android/repository/$TOOLS_ZIP_FILENAME

if [ -f /tmp/$TOOLS_ZIP_FILENAME ];
then
    echo "Found downloaded file at /tmp/$TOOLS_ZIP_FILENAME"
else
    echo "Download failed, please retry, or download from https://developer.android.com/studio/ and save to /tmp"
    exit 1
fi

echo "Installing the command line tools"
mkdir -p $ANDROID_SDK_ROOT/cmdline-tools/latest
unzip /tmp/$TOOLS_ZIP_FILENAME -d $ANDROID_SDK_ROOT/cmdline-tools/latest/
mv $ANDROID_SDK_ROOT/cmdline-tools/latest/cmdline-tools/* $ANDROID_SDK_ROOT/cmdline-tools/latest/
rm -rf $ANDROID_SDK_ROOT/cmdline-tools/latest/cmdline-tools/

echo "Downloading the android SDK. This will take a LONG time and will require you to agree to lots of licenses."
read -p "Do you wish to continue? (Y/N)" CONTINUE
if [ $CONTINUE == "Y" ];
then
    echo "BEGIN: About to start android SDK download"
    $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --package_file=setup/android_sdk_packages
    echo "END: Done with android SDK download, exiting script"
else
    echo "Please install this before proceeding with the installation steps"
    exit 1
fi
