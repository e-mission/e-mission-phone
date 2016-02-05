e-mission phone app
--------------------

This is the phone component of the e-mission system.

Installing
---
We are using the ionic platform, which is a toolchain on top of the apache
cordova project. So the first step is to install ionic using their instructions.
http://ionicframework.com/getting-started/

Then, get the current version of our code
1. Fork this repo using the github UI
1. Clone your fork
    $ git clone <your repo URL>
1. Restore platforms and plugins. This is a good time to get a cup of your favorite beverage
    $ ionic state restore
1. Install all javascript components using bower
    $ bower update

Installation is now complete. You can view the current state of the application in the emulator
    $ ionic emulate ios --target="iPhone-6"

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
Once I merge the pull request, pull the changes and delete the branch
    $ git checkout master
    $ git pull upstream master
    $ git branch -d mybranch
