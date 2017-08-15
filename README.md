e-mission phone app
--------------------

This is the phone component of the e-mission system.

Installing
---
We are using the ionic v2.2.1 platform, which is a toolchain on top of the apache
cordova project. So the first step is to install ionic using their instructions.
http://ionicframework.com/docs/v1/getting-started/

NOTE: Since we are still on ionic v1, please do not install v2 or v3, as the current codebase will not work with it.
Issue the following commands to install Cordova and Ionic instead of the ones provided in the instruction above.

```
$ npm install -g cordova@6.5.0
$ npm install -g ionic@2.2.1
```

Then, get the current version of our code

Fork this repo using the github UI

Clone your fork

``
$ git clone <your repo URL>
``

``
$ cd e-mission-phone
``

Enable platform hooks, including http on iOS9

``
$ git clone https://github.com/driftyco/ionic-package-hooks.git ./package-hooks
``

Install all javascript components using bower

``
$ bower update
``

Create a remote to pull updates from upstream

``
$ git remote add upstream https://github.com/e-mission/e-mission-phone.git
``

Generate your App ID

``
$ ionic io init
``

Setup cocoapods. For all versions > 1.9, we need https://cocoapods.org/ support. This is used by the push plugin for the GCM pod, and by the auth plugin to install the GTMOAuth framework. This is a good time to get a cup of your favourite beverage.

```
$ sudo gem install cocoapods
$ pod setup
```

To debug the cocoapods install, or make it less resource intensive, check out troubleshooting guide for the push plugin.
https://github.com/phonegap/phonegap-plugin-push/blob/master/docs/INSTALLATION.md#cocoapods

Next, restore platforms and plugins. This is a good time to get a second cup of your favorite beverage

``
$ ionic state restore
``

Finally, make sure to install the other node modules required for the setup scripts.

```
npm install
```

Copy the sample json config files and fill in real values if you have them.

```
ls www/json/*.sample
cp www/json/setupConfig.json.sample www/json/setupConfig.json
cp www/json/connectionConfig.json.sample www/json/connectionConfig.json
...
```

Installation is now complete. You can view the current state of the application in the emulator

    $ ionic emulate ios --target="iPhone-6"

JS Testing
---
From the root directory run

    $ npm install karma --save-dev
    $ npm install karma-jasmine karma-chrome-launcher --save-dev

Write tests in www/js/test
To run tests if you have karma globally set, run 

    $ karma start my.conf.js 
    
in the root directory. If you didn't run the -g command, you can run
tests with 

    $ ./node_modules/karma/bin/karma start
    
in the root directory

Troubleshooting
---

Sometimes the IOS emulator doesn't work when called from command line. If so, you can use Xcode to load
the project:

``
      /e-mission-phone/platforms/ios/emission.xcworkspace
``

and then run the project with IOS emulator.
Make sure you use the most recent version of Xcode - older versions may not support some newer functionality.

---

Some versions of Gradle create unnecessary files that may result in errors while building the app. Gradle 2.14.1 has proven to work without any issues.
If errors persist, make sure 
``
	  /e-mission-phone/platforms/android/gradle/wrapper/gradle-wrapper.properties
``
looks like this:
```
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-2.14.1-all.zip
```
---

The Android platform requires API levels 18-21, make sure you have installed them in the SDK manager.

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
Game - Adding Habitica Avatar
---
E-mission-phone does not use the API to get the Habitica avatar, instead it uses the same HTML, dependencies and PNG files as Habitica to generate the avatar. The avatar PNG are converted into CSS using [gulp.spritesmith](https://github.com/twolfson/gulp.spritesmith/blob/master/README.md)

Habitrpg frequently updates sprites PNG and CSS folders and the dependencies may change too, so E-mission-phone may have to change sprites folders using the following guide:

Habitrgp uses Jade template instead of HTML but E-mission-phone uses HTML. 
	
	1. Use the [Habitica API](https://habitica.com/apidoc/#api-DataExport-ExportUserAvatarHtml) with a habitica user id on the browser to render an user avatar HTML page.
	2. Right click on the HTML page and click the Inspect option (This shows the Avatar HTML instead of Jade).
	3. Use the body of HTML inside the <figure> tag

The avatar has seperate PNG for head, costume, shirt, pet etc. Spritesmith converts the PNG to an avatar. The spritesmith gulp JavaScript that converts the PNG to a CSS avatar is located at www/tasks/gulp-sprites.js, updated this file according to Habitrpg repo. If there is a new PNG with different height and width than the defult PNGs, change this JavaScript.

The PNG and CSS folder that has the avatar is located at www/common/. Add new avatar PNG and CSS here.

Walk through to clone the required files from habitrpg to emission
	
1. Clone habitrpg repository

		$ git clone https://github.com/HabitRPG/habitrpg.git

2. Make task file in emission

		$ cd e-mission-phone/www/js/
		$ mkdir tasks

3. Copy the gulp-sprites.js file from habitrpg to emission

		$ cp -r habitrpg/tasks/gulp-sprites.js e-mission-phone/www/js/tasks/

4. Add the following line to e-mission-phone/gulpfule.js to sycn the gulp-sprites.js file

		require('glob').sync('/www/tasks/gulp-*').forEach(require);

5. Copy the 3 folders from habitrpg/common- css, dist and img, and paste it to e-mission-phone/www/common

		$ cd e-mission-phone/www
		$ mkdir common
		$ cp -r habitrpg/common/css e-mission-phone/www/common
		$ cp -r habitrpg/common/dist e-mission-phone/www/common
		$ cp -r habitrpg/common/img e-mission-phone/www/common
	
6. In e-mission-phone/www/js/tasks/gulp-sprite.js add www/ before common to all the lines those point to th common folder that was copied from habitrpg to e-mission-phone

7. To add the avatar herobox css copy all the herobox class from habitrpg/website/build/app.css to one of the css folders in e-mission-phone 


Alternative way is to get the avatar PNG directly through the API. E-mission-phone has Content-Security-Policy that blocks unknown contents, to allow E-mission-phone to recognize the URL add the Habitrpg server URL and the s3 URL to “Content-Secutiry-Policy” in the head of www/templates/index.html   
