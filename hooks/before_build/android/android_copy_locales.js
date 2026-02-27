#!/usr/bin/env node

var fs = require('fs-extra');
var path = require('path');
const LOG_NAME = "Copying locales: ";

module.exports = function (context) {
    var localesFolder = path.join(context.opts.projectRoot, 'locales/');

    // If Android platform is not installed, don't even execute
    if (context.opts.cordova.platforms.indexOf('android') < 0 || !fs.existsSync(localesFolder))
        return;
    
    var languagesFolders = fs.readdirSync(localesFolder);
    // It's not problematic but we will remove them to have cleaner logs.
    var filterItems = ['.git', 'LICENSE', 'README.md']
    languagesFolders = languagesFolders.filter(item => !filterItems.includes(item));
    console.log(LOG_NAME + "Languages found -> " + languagesFolders);
    languagesFolders.forEach(function (language) {
        console.log(LOG_NAME + 'I found ' + language + ", I will now copy the files.")
        var platformRes = path.join(context.opts.projectRoot, 'platforms/android/app/src/main/res');
        var languageFolder = localesFolder + "/" + language;

        var values = "/values-" + language;
        var valuesFolder = path.join(languageFolder, values);
        if (fs.existsSync(valuesFolder)) {
            console.log(LOG_NAME + "Copying " + valuesFolder + " to " + platformRes);

            var platformValues = platformRes + values;
            if (!fs.existsSync(platformValues)) {
                console.log(LOG_NAME + platformValues + "does not exist, I will create it.");
                fs.mkdirSync(platformValues, {recursive: true});
            }

            fs.copySync(valuesFolder, platformValues);
            console.log(LOG_NAME + valuesFolder + "copied...")
        } else {
            console.log(LOG_NAME + valuesFolder + " not found, I will continue.")
        }
    });
}
