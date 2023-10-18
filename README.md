e-mission phone app
--------------------

This is the phone component of the e-mission system.

:sparkles: This has been upgraded to the latest **Android**, **iOS**, **cordova-lib**, **node** and **npm** versions. __This is ready to build out of the box.__

The currently supported versions are in [`package.cordovabuild.json`](package.cordovabuild.json)

Additional Documentation
---
Additional documentation has been moved to its own repository [e-mission-docs](https://github.com/e-mission/e-mission-docs). Specific e-mission-phone wikis can be found here:
https://github.com/e-mission/e-mission-docs/tree/master/docs/e-mission-phone

**Issues:** Since this repository is part of a larger project, all issues are tracked [in the central docs repository](https://github.com/e-mission/e-mission-docs/issues). If you have a question, [as suggested by the open source guide](https://opensource.guide/how-to-contribute/#communicating-effectively), please file an issue instead of sending an email. Since issues are public, other contributors can try to answer the question and benefit from the answer.

## Contents
#### 1. [Updating the UI only](#updating-the-ui-only)
#### 2. [End to End Testing](#end-to-end-testing)   
#### 3. [Updating the e-mission-* plugins or adding new plugins](#updating-the-e-mission--plugins-or-adding-new-plugins)
#### 4. [Creating logos](#creating-logos) 
#### 5. [Beta-testing debugging](#beta-testing-debugging) 
#### 6. [Contributing](#contributing)

Updating the UI only
---
[![osx-serve-install](https://github.com/e-mission/e-mission-phone/workflows/osx-serve-install/badge.svg)](https://github.com/e-mission/e-mission-phone/actions?query=workflow%3Aosx-serve-install)

If you want to make only UI changes, (as opposed to modifying the existing plugins, adding new plugins, etc), you can use the **new and improved** (as of June 2018) [e-mission dev app](https://github.com/e-mission/e-mission-devapp/) and install the most recent version from [releases](https://github.com/e-mission/e-mission-devapp/releases). 

### Installing (one-time)

Run the setup script

```
bash setup/setup_serve.sh
```

**(optional)** Configure by changing the files in `www/json`.
Defaults are in `www/json/*.sample`

```
ls www/json/*.sample
cp www/json/startupConfig.json.sample www/json/startupConfig.json
cp ..... www/json/connectionConfig.json
```

### Activation (after install, and in every new shell)

```
source setup/activate_serve.sh
```
  
### Running

1. Start the phonegap deployment server and note the URL(s) that the server is listening to.

    ```
    npm run serve
    ....
    [phonegap] listening on 10.0.0.14:3000
    [phonegap] listening on 192.168.162.1:3000
    [phonegap]
    [phonegap] ctrl-c to stop the server
    [phonegap]
    ....
    ```
  
1. Change the devapp connection URL to one of these (e.g. 192.168.162.1:3000) and press "Connect"
1. The app will now display the version of e-mission app that is in your local directory
  1. The console logs will be displayed back in the server window (prefaced by `[console]`)
  1. Breakpoints can be added by connecting through the browser
    - Safari ([enable develop menu](https://support.apple.com/guide/safari/use-the-safari-develop-menu-sfri20948/mac)): Develop -> Simulator -> index.html
    - Chrome: chrome://inspect -> Remote target (emulator)
    
**Ta-da!** :gift: If you change any of the files in the `www` directory, the app will automatically be re-loaded without manually restarting either the server or the app :tada:

**Note1**: You may need to scroll up, past all the warnings about `Content Security Policy has been added` to find the port that the server is listening to.

End to end testing
---
A lot of the visualizations that we display in the phone client come from the server. In order to do end to end testing, we need to run a local server and connect to it. Instructions for:

1. installing a local server,
2. running it, 
3. loading it with test data, and
4. running analysis on it

are available in the [e-mission-server README](https://github.com/e-mission/e-mission-server/blob/master/README.md).

In order to make end to end testing easy, if the local server is started on a HTTP (versus HTTPS port), it is in development mode.  By default, the phone app connects to the local server (localhost on iOS, [10.0.2.2 on android](https://stackoverflow.com/questions/5806220/how-to-connect-to-my-http-localhost-web-server-from-android-emulator-in-eclips)) with the `prompted-auth` authentication method. To connect to a different server, or to use a different authentication method, you need to create a `www/json/connectionConfig.json` file. More details on configuring authentication [can be found in the docs](https://github.com/e-mission/e-mission-docs/blob/master/docs/install/configuring_authentication.md).

One advantage of using `skip` authentication in development mode is that any user email can be entered without a password. Developers can use one of the emails that they loaded test data for in step (3) above. So if the test data loaded was with `-u shankari@eecs.berkeley.edu`, then the login email for the phone app would also be `shankari@eecs.berkeley.edu`.

Updating the e-mission-\* plugins or adding new plugins
---
[![osx-build-ios](https://github.com/e-mission/e-mission-phone/actions/workflows/ios-build.yml/badge.svg)](https://github.com/e-mission/e-mission-phone/actions/workflows/ios-build.yml)
[![osx-build-android](https://github.com/e-mission/e-mission-phone/actions/workflows/android-build.yml/badge.svg)](https://github.com/e-mission/e-mission-phone/actions/workflows/android-build.yml)
[![osx-android-prereq-sdk-install](https://github.com/e-mission/e-mission-phone/actions/workflows/android-automated-sdk-install.yml/badge.svg)](https://github.com/e-mission/e-mission-phone/actions/workflows/android-automated-sdk-install.yml)

Pre-requisites
---
- the version of xcode used by the CI
    - to install a particular version, use [xcode-select](https://www.unix.com/man-page/OSX/1/xcode-select/)
    - or this [supposedly easier to use repo](https://github.com/xcpretty/xcode-install)
    - **NOTE**: the basic xcode install on Catalina was messed up for me due to a prior installation of command line tools. [These workarounds helped](https://github.com/nodejs/node-gyp/blob/master/macOS_Catalina.md).
- git
- Java 17. Tested with [OpenJDK 17 (Temurin) using Adoptium](https://adoptium.net).
- android SDK; install manually or use setup script below. Note that you only need to run this once **per computer**.
    ```
    bash setup/prereq_android_sdk_install.sh
    ```

    <details><summary>Expected output</summary>

    ```
    Downloading the command line tools for mac
      % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                     Dload  Upload   Total   Spent    Left  Speed
    100  114M  100  114M    0     0  8092k      0  0:00:14  0:00:14 --:--:-- 8491k
    Found downloaded file at /tmp/commandlinetools-mac-8092744_latest.zip
    Installing the command line tools
    Archive:  /tmp/commandlinetools-mac-8092744_latest.zip
    ...
    Downloading the android SDK. This will take a LONG time and will require you to agree to lots of licenses.
    Do you wish to continue? (Y/N)Y
    ...
    Accept? (y/N): Y
    ...
    [======                                 ] 17% Downloading x86_64-23_r33.zip... s
    ```

    </details>
- if you are not on the most recent version of OSX, `homebrew`
    - this allows us to install the current version of cocoapods without
      running into ruby incompatibilities - e.g.
      https://github.com/CocoaPods/CocoaPods/issues/11763

Important
---
Most of the recent issues encountered have been due to incompatible setup. We
have now:
- locked down the dependencies,
- created setup and teardown scripts to setup self-contained environments with
  those dependencies, and
- CI enabled to validate that they continue work.

If you have setup failures, please compare the configuration in the passing CI
builds with your configuration. That is almost certainly the source of the error.

Installing (one time only)
---
Run the setup script for the platform you want to build

```
bash setup/setup_android_native.sh
```
AND/OR
```
bash setup/setup_ios_native.sh
```

**(optional)** Configure by changing the files in `www/json`.
Defaults are in `www/json/*.sample`

```
ls www/json/*.sample
cp www/json/startupConfig.json.sample www/json/startupConfig.json
cp ..... www/json/connectionConfig.json
```

### Activation (after install, and in every new shell)

```
source setup/activate_native.sh
```

<details><summary> Expected Output </summary>

``` 
Activating nvm
Using version <X version number>
Now using node <X version number> (npm <Y version>)
npm version = <Y version>
Adding cocoapods to the path
Verifying /Users/<username>/Library/Android/sk or /Users/<username>/Library/Android/sdk is set
Activating sdkman, and by default, gradle
Ensuring that we use the most recent version of the command line tools
Configuring the repo for building native code
Copied config.cordovabuild.xml -> config.xml and package.cordovabuild.json -> package.json
```

</details>


### Activation (after install, and in every new shell)

If connecting to a development server over http, make sure to turn on http support on android

```
    <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
        <application android:usesCleartextTraffic="true"/>
    </edit-config>
```

### Building the app

We offer a set of build scripts you can pick from, each of which i) bundle the JS with Webpack and then ii) proceed with a Cordova build.
You can bundle JS in 'production' or 'dev' mode, and you can build Android or iOS or both.
The common use cases will be:

- `npm run build` (to build for production on both Android and iOS platforms)
- `npm run build-prod-android` (to build for production on Android platform only)
- `npm run build-prod-ios` (to build for production on iOS platform only)

Find the full list of these scripts in [`package.cordovabuild.json`](package.cordovabuild.json)

<details><summary>Expected output (Android build)</summary>

```
BUILD SUCCESSFUL in 2m 48s
52 actionable tasks: 52 executed
Built the following apk(s):
/Users/<Username>/e-mission-phone/platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

</details> 

Creating logos
---
If you are building your own version of the app, you must have your own logo to
avoid app store conficts. Updating the logo is very simple using the [`ionic
cordova resources`](https://ionicframework.com/docs/v3/cli/cordova/resources/)
command.

**Note**: You may have to install the [`cordova-res` package](https://github.com/ionic-team/cordova-res) for the command to work


Troubleshooting
---
- Make sure to use `npx ionic` and `npx cordova`. This is
  because the setup script installs all the modules locally in a self-contained
  environment using `npm install` and not `npm install -g`
- Check the CI to see whether there is a known issue
- Run the commands from the script one by one and see which fails
    - compare the failed command with the CI logs
- Another workaround is to delete the local environment and recreate it
    - javascript errors: `rm -rf node_modules && npm install`
    - native code compile errors: `rm -rf plugins && rm -rf platforms && npx cordova prepare`

Beta-testing debugging
---
If users run into problems, they have the ability to email logs to the
maintainer. These logs are in the form of an sqlite3 database, so they have to
be opened using `sqlite3`. Alternatively, you can export it to a csv with
dates using the `bin/csv_export_add_date.py` script.

```
<download the log file>
$ mv ~/Downloads/loggerDB /tmp/logger.<issue>
$ pwd
.../e-mission-phone
$ python bin/csv_export_add_date.py /tmp/loggerDB.<issue>
$ less /tmp/loggerDB.<issue>.withdate.log
```

Contributing
---

Add the main repo as upstream

    git remote add upstream https://github.com/e-mission/e-mission-phone.git

Create a new branch (IMPORTANT). Please do not submit pull requests from master

    git checkout -b mybranch

Make changes to the branch and commit them

    git commit

Push the changes to your local fork

    git push origin mybranch

Generate a pull request from the UI

Address my review comments

Once I merge the pull request, pull the changes to your fork and delete the branch
```
git checkout master
```
```
git pull upstream master
```
```
git push origin master
```
```
git branch -d <branch>
```
