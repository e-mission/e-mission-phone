/*
 * A hook to change provider in order to match with the application name.
 */

var fs = require('fs');
var path = require('path');
var et = require('elementtree');

const PROVIDER = "edu.berkeley.eecs.emission.provider";
const ACCOUNT_TYPE = "eecs.berkeley.edu";
const LOG_NAME = "Changing Providers: ";

var changeProvider = function (file, currentName, newName) {
    if (fs.existsSync(file)) {
        fs.readFile(file, 'utf8', function (err, data) {
            if (err) {
                throw new Error(LOG_NAME + 'Unable to find ' + file + ': ' + err);
            }

            var regEx = new RegExp(currentName, 'g');

            var result = data.replace(regEx, newName + '.provider');
            
            fs.writeFile(file, result, 'utf8', function (err) {
                if (err) throw new Error(LOG_NAME + 'Unable to write into ' + file + ': ' + err);
                console.log(LOG_NAME + "" + file + " updated...")
            });
        });
    }
}

var changeAccountType = function (file, currentName, newName) {
    if (fs.existsSync(file)) {

        fs.readFile(file, 'utf8', function (err, data) {
            if (err) {
                throw new Error(LOG_NAME + 'Unable to find ' + file + ': ' + err);
            }

            var regEx = new RegExp(currentName, 'g');

            var result = data.replace(regEx, newName);

            fs.writeFile(file, result, 'utf8', function (err) {
                if (err) throw new Error('Unable to write into ' + file + ': ' + err);
                console.log(LOG_NAME + "" + file + " updated...")
            });


        });
    }
}


var changeAccountTypeAndProvider = function (file, accountType, providerName, newName) {
    if (fs.existsSync(file)) {

        fs.readFile(file, 'utf8', function (err, data) {
            if (err) {
                throw new Error(LOG_NAME + 'Unable to find ' + file + ': ' + err);
            }

            var regEx1 = new RegExp(accountType, 'g');
            var regEx2 = new RegExp(providerName, 'g');

            var result = data.replace(regEx1, newName);
            result = result.replace(regEx2, newName + '.provider');

            fs.writeFile(file, result, 'utf8', function (err) {
                if (err) throw new Error(LOG_NAME + 'Unable to write into ' + file + ': ' + err);
                console.log(LOG_NAME + "" + file + " updated...")
            });
        });
    } else {
        console.error(LOG_NAME + "File "+file+" does not exist");
    }
}

module.exports = function (context) {
    // If Android platform is not installed, don't even execute
    if (!context.opts.platforms.includes('android')) return;

    console.log(LOG_NAME + "Retrieving application name...")
    var config_xml = path.join(context.opts.projectRoot, 'config.xml');
    var data = fs.readFileSync(config_xml).toString();
    // If no data then no config.xml
    if (data) {
        var etree = et.parse(data);
        var applicationName = etree._root.attrib.id;
        console.log(LOG_NAME + "Your application is " + applicationName);

        var platformRoot = path.join(context.opts.projectRoot, 'platforms/android/app/src/main')

        console.log(LOG_NAME + "Updating AndroidManifest.xml...");
        var androidManifest = path.join(platformRoot, 'AndroidManifest.xml');
        changeProvider(androidManifest, PROVIDER, applicationName);

        console.log(LOG_NAME + "Updating syncadapter.xml");
        var syncAdapter = path.join(platformRoot, 'res/xml/syncadapter.xml');
        changeAccountTypeAndProvider(syncAdapter, ACCOUNT_TYPE, PROVIDER, applicationName);

        console.log(LOG_NAME + "Updating authenticator.xml");
        var authenticator = path.join(platformRoot, 'res/xml/authenticator.xml');
        changeAccountType(authenticator, ACCOUNT_TYPE, applicationName);

        console.log(LOG_NAME + "Updating ServerSyncPlugin.java");
        var serverSyncPlugin = path.join(platformRoot, 'java/edu/berkeley/eecs/emission/cordova/serversync/ServerSyncPlugin.java');
        changeAccountTypeAndProvider(serverSyncPlugin, ACCOUNT_TYPE, PROVIDER, applicationName);
    } else {
        throw new Error(LOG_NAME + "Could not retrieve application name.");
    }
}
