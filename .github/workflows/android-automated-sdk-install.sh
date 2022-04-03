name: osx-install-android-sdk-automated

# Controls when the action will run. Triggers the workflow on push or pull request
# events but only for the master branch
on:
  push:
#     paths:
#       - 'setup/prereq_android_sdk_install.sh'
  pull_request:
#     paths:
#       - 'setup/prereq_android_sdk_install.sh'
  schedule:
    # * is a special character in YAML so you have to quote this string
    - cron:  '5 4 * * 0'

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  # This workflow contains a single job called "build"
  install:
    # The type of runner that the job will run on
    runs-on: macos-latest

    env:
      NEW_ANDROID_SDK_ROOT: /tmp/new-install/Android/sdk

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
    # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
    - uses: actions/checkout@v2

    # Runs a single command using the runners shell
    - name: Print the current SDK root and version
      run: |
        echo "SDK root before install $ANDROID_SDK_ROOT"
        cat $ANDROID_SDK_ROOT/cmdline-tools/latest/source.properties
        echo "Existing installed packages"
        $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --list-installed

#     - name: Install to a new SDK root
#       run: |
#         export ANDROID_SDK_ROOT=$NEW_ANDROID_SDK_ROOT
#         echo "New SDK root $ANDROID_SDK_ROOT"
#         yes Y | setup/prereq_android_sdk_install.sh
# 
#     - name: Verify that all packages are as expected
#       shell: bash -l {0}
#       run: |
#         echo "Comparing $ANDROID_SDK_ROOT and $NEW_ANDROID_SDK_ROOT"
#         $ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --list_installed > /tmp/existing_packages
#         $NEW_ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager --list_installed > /tmp/new_packages
#         diff /tmp/existing_packages /tmp/new_packages
# 
#     - name: Verify that directory structure is consistent
#       shell: bash -l {0}
#       run: |
#         export ANDROID_SDK_ROOT=$NEW_ANDROID_SDK_ROOT
#         echo "New SDK root $ANDROID_SDK_ROOT"
#         ls -al $ANDROID_SDK_ROOT
#         if [ ! -f $ANDROID_SDK_ROOT/emulator ]; then exit 1 fi
#         if [ ! -f $ANDROID_SDK_ROOT/build-tools ]; then exit 1 fi
#         if [ ! -f $ANDROID_SDK_ROOT/patcher ]; then exit 1 fi
#         if [ ! -f $ANDROID_SDK_ROOT/extras ]; then exit 1 fi
#         if [ ! -f $ANDROID_SDK_ROOT/platforms ]; then exit 1 fi
#         if [ ! -f $ANDROID_SDK_ROOT/platform-tools ]; then exit 1 fi
#         if [ ! -f $ANDROID_SDK_ROOT/system-images ]; then exit 1 fi
# 
#     - name: Ensure that the path is correct and installed programs are runnable
#       shell: bash -l {0}
#       run: |
#         export JAVA_HOME=$JAVA_HOME_11_X64
#         export ANDROID_SDK_ROOT=$NEW_ANDROID_SDK_ROOT
#         echo "New SDK root $ANDROID_SDK_ROOT"
#         source setup/activate_native.sh
#         $ANDROID_SDK_ROOT/emulator/emulator -list-avds
