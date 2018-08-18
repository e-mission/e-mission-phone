e-mission phone app
--------------------

[![Join the chat at https://gitter.im/e-mission/e-mission-phone](https://badges.gitter.im/e-mission/e-mission-phone.svg)](https://gitter.im/e-mission/e-mission-phone?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This is the phone component of the e-mission system.

Updating the UI only
---
If you want to make only UI changes, (as opposed to modifying the existing plugins, adding new plugins, etc), you can use the **new and improved** (as of June 2018) e-mission dev app. 

### Dependencies
1. node.js: You probably want to install this using [nvm](https://github.com/creationix/nvm), to ensure that you can pick a particular [version of node](https://github.com/creationix/nvm#usage).
    ```
    $ node -v
    v9.4.0
    $ npm -v
    6.0.0
    ```
    
  Make sure that the permissions are set correctly - npm and node need to be owned by `root` or another admin user.

  ```
  $ which npm
  /usr/local/bin/npm
  $ ls -al /usr/local/bin/npm
  lrwxr-xr-x  1 root  wheel  38 May  8 10:04 /usr/local/bin/npm -> ../lib/node_modules/npm/bin/npm-cli.js
  $ ls -al /usr/local/lib/node_modules/npm/bin/npm-cli.js
  -rwxr-xr-x  1 cusgadmin  staff  4295 Oct 26  1985 /usr/local/lib/node_modules/npm/bin/npm-cli.js
  ```
  
2. [bower](https://bower.io/):

  ```
  $ bower -v
  1.8.4
  ```

### Installation
1. Install the most recent release of the em-devapp (https://github.com/e-mission/e-mission-devapp)

1. Get the current version of the phone UI code

    1. Fork this repo using the github UI

    1. Clone your fork

    ```
    $ git clone <your repo URL>
    ```

    ```
    $ cd e-mission-phone
    ```
    
1. Create a remote to pull updates from upstream

    ```
    $ git remote add upstream https://github.com/e-mission/e-mission-phone.git
    ```
    
1. Setup the config

    ```
    $ ./bin/configure_xml_and_json.js serve
    ```

1. Install all required node modules 

    ```
    $ npm install
    ```
 1. Install javascript dependencies
 
    ```
    $ bower install
    ```
    
1. Configure values if necessary - e.g.

    ```
    $ ls www/json/*.sample
    $ cp www/json/setupConfig.json.sample www/json/setupConfig.json
    $ cp ..... www/json/connectionConfig.json
    ```
  
1. Run the setup script

    ```
    $ npm run setup-serve
    > edu.berkeley.eecs.emission@2.5.0 setup /private/tmp/e-mission-phone
    > ./bin/download_settings_controls.js

    Sync collection settings updated
    Data collection settings updated
    Transition notify settings updated
    ```
  
### Running

1. Start the phonegap deployment server and note the URL(s) that the server is listening to.

    ```
    $ npm run serve
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
    
**Ta-da!** If you change any of the files in the `www` directory, the app will automatically be re-loaded without manually restarting either the server or the app.

**Note1**: You may need to scroll up, past all the warnings about `Content Security Policy has been added` to find the port that the server is listening to.


End to end testing
---
A lot of the visualizations that we display in the phone client come from the server. In order to do end to end testing, we need to run a local server and connect to it. Instructions for:

1. installing a local server,
2. running it, 
3. loading it with test data, and
4. running analysis on it

are available in the [e-mission-server README](https://github.com/e-mission/e-mission-server/blob/master/README.md).

In order to make end to end testing easy, if the local server is started on a HTTP (versus HTTPS port), it is in development mode and it has effectively no authentication. It expects the user token to contain the user email *in plaintext*.

By default, the phone app connects to the local server (localhost on iOS,
[10.0.2.2 on
android](https://stackoverflow.com/questions/5806220/how-to-connect-to-my-http-localhost-web-server-from-android-emulator-in-eclips))
by default. To connect to a different server, or to use a different
authentication method, you need to create a `www/json/connectionConfig.json`
file. You can find sample files for connecting physical devices to the local
server (`www/json/connectionConfig.physical_device2localhost.json.sample`), and
to production (www/json/connectionConfig.production.json.sample).

So when the phone app connects to a server that is in development mode, it is also in development mode. This means that any user email can be entered without a password. Developers should use one of the emails that they loaded test data for in step (3) above. So if the test data loaded was with `-u shankari@eecs.berkeley.edu`, then the login email for the phone app would also be `shankari@eecs.berkeley.edu`.

Updating the e-mission-* plugins or adding new plugins
---

Installing
---
We are using the ionic v3.19.1 platform, which is a toolchain on top of the apache
cordova project. So the first step is to install ionic using their instructions.
http://ionicframework.com/docs/v1/getting-started/

NOTE: Since we are still on ionic v1, please do not install v2 or v3, as the current codebase will not work with it.
Issue the following commands to install Cordova and Ionic instead of the ones provided in the instruction above.

```
$ npm install -g cordova@8.0.0
$ npm install -g ionic@3.19.1
```

Install gradle (https://gradle.org/install/) for android builds.

Then, get the current version of our code

Fork this repo using the github UI

Clone your fork

```
$ git clone <your repo URL>
```

```
$ cd e-mission-phone
```

Enable platform hooks, including http on iOS9

```
$ git clone https://github.com/driftyco/ionic-package-hooks.git ./package-hooks
```

Setup the config

```
$ ./bin/configure_xml_and_json.js cordovabuild
```

Install all javascript components using bower

```
$ bower update
```

Make sure to install the other node modules required for the setup scripts.

```
npm install
```

Create a remote to pull updates from upstream

```
$ git remote add upstream https://github.com/e-mission/e-mission-phone.git
```

Setup cocoapods. For all versions > 1.9, we need https://cocoapods.org/ support. This is used by the push plugin for the GCM pod, and by the auth plugin to install the GTMOAuth framework. This is a good time to get a cup of your favourite beverage.

```
$ sudo gem install cocoapods
$ pod setup
```

To debug the cocoapods install, or make it less resource intensive, check out troubleshooting guide for the push plugin.
https://github.com/phonegap/phonegap-plugin-push/blob/master/docs/INSTALLATION.md#cocoapods

Configure values if necessary - e.g.

```
ls www/json/*.sample
cp www/json/setupConfig.json.sample www/json/setupConfig.json
cp ..... www/json/connectionConfig.json
```

Restore cordova platforms and plugins

```
$ cordova prepare
```

Installation is now complete. You can view the current state of the application in the emulator

    $ cordova emulate ios

    OR 

    $ cordova emulate android

The android build and emulator have improved significantly in the last release
of Android Studio (3.0.1).  The build is significantly faster than iOS, the
emulator is just as snappy, and the debugger is better since chrome saves logs
from startup, so you don't have to use tricks like adding alerts to see errors
in startup.

**Note:** Sometimes, the last command (`$ cordova prepare`) fails because of errors while cloning plugins (`Failed to restore plugin "..." from config.xml.`). A workaround is at https://github.com/e-mission/e-mission-docs/blob/master/docs/overview/high_level_faq.md#i-get-an-error-while-adding-plugins

Troubleshooting
---

Troubleshooting tips have now been moved to their own wiki page
https://github.com/e-mission/e-mission-phone/wiki/Troubleshooting-tips-(FAQ)

Debugging
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

Create a new branch (IMPORTANT). Please do not submit pull requests from master

    $ git checkout -b mybranch

Make changes to the branch and commit them

    $ git commit

Push the changes to your local fork

    $ git push origin mybranch

Generate a pull request from the UI

Address my review comments

Once I merge the pull request, pull the changes to your fork and delete the branch
```
$ git checkout master
$ git pull upstream master
$ git push origin master
$ git branch -d mybranch
```
