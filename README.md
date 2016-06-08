e-mission phone app
--------------------

This is the phone component of the e-mission system.

Installing
---
We are using the ionic platform, which is a toolchain on top of the apache
cordova project. So the first step is to install ionic using their instructions.
http://ionicframework.com/getting-started/

Then, get the current version of our code

Fork this repo using the github UI

Clone your fork

``
$ git clone <your repo URL>
``

Restore platforms and plugins. This is a good time to get a cup of your favorite beverage

``
$ ionic state restore
``

Enable platform hooks, including http on iOS9

``
$ git clone https://github.com/driftyco/ionic-package-hooks.git ./package-hooks
``

Install all javascript components using bower

``
$ bower update
``

Installation is now complete. You can view the current state of the application in the emulator

    $ ionic emulate ios --target="iPhone-6"


#### Temporary workaround *for android only* ####
Unfortunately, `ionic state` does not store plugin version numbers, and
versions of crosswalk > 16 are so large that the generated APK is too big
and needs `multi-dex` support.
https://developer.android.com/studio/build/multidex.html#mdex-gradle

It looks like multi-dex is a pain, and is complicated to use with cordova since
it requires a modification to the AndroidManifest.xml to use a different
activity.

```
In your manifest add the MultiDexApplication class from the multidex support library to the application element.
```

It seems like it would be a Good Thing to trim down the app anyway instead of
using multi-dex, since that will also help with memory usage and with load
times. But for now, the workaround is to force the use of the older and smaller
crosswalk version.

So before we build the android version, we need to do
```
$ cordova plugin remove cordova-plugin-crosswalk-webview
$ cordova plugin add cordova-plugin-crosswalk-webview@1.5.0
```

This does NOT affect iOS.

Troubleshooting
---

Sometimes the IOS emulator doesn't work when called from command line. If so, you can use Xcode to load
the project:

``
      /e-mission-phone/platforms/ios/emission.xcodeproj
``

and then run the project with IOS emulator.

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

End to end testing
---
A lot of the visualizations that we display in the phone client come from the server. In order to do end to end testing, we need to run a local server and connect to it. Instructions for:

1. installing a local server,
2. running it, 
3. loading it with test data, and
4. running analysis on it

are available in the [e-mission-server README](https://github.com/e-mission/e-mission-server/blob/master/README.md).

In order to make end to end testing easy, if the local server is started on a HTTP (versus HTTPS port), it is in development mode and it has effectively no authentication. It expects the user token to contain the user email *in plaintext*.

So when the phone app connects to a server that is in development mode, it is also in development mode. This means that any user email can be entered without a password. Developers should use one of the emails that they loaded test data for in step (3) above. So if the test data loaded was with `-u shankari@eecs.berkeley.edu`, then the login email for the phone app would also be `shankari@eecs.berkeley.edu`.

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
