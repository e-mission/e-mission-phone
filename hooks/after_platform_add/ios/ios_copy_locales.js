#!/usr/bin/env node

var fs = require('fs-extra');
var path = require('path');
var et = require('elementtree');

const LOG_NAME = "Copying locales: ";

module.exports = function (context) {
    // If ios platform is not installed, don't even execute
    var localesFolder = path.join(context.opts.projectRoot, 'locales/');

    if (context.opts.cordova.platforms.indexOf('ios') < 0 || !fs.existsSync(localesFolder))
        return;
    
    console.log(LOG_NAME + "Retrieving application name...")
    var config_xml = path.join(context.opts.projectRoot, 'config.xml');
    var data = fs.readFileSync(config_xml).toString();
    // If no data then no config.xml
    if (data) {
        var etree = et.parse(data);
        var applicationName = etree.findtext('./name');
        console.log(LOG_NAME + "Your application is " + applicationName);
        var localesFolder = path.join(context.opts.projectRoot, 'locales/');

        var languagesFolders = fs.readdirSync(localesFolder);
        // It's not problematic but we will remove them to have cleaner logs.
        var filterItems = ['.git', 'LICENSE', 'README.md']
        languagesFolders = languagesFolders.filter(item => !filterItems.includes(item));
        console.log(LOG_NAME + "Languages found -> " + languagesFolders);
        languagesFolders.forEach(function (language) {
            console.log(LOG_NAME + 'I found ' + language + ", I will now copy the files.")
            var platformRes = path.join(context.opts.projectRoot, 'platforms/ios/' + applicationName + "/Resources/");
            var wwwi18n = path.join(context.opts.projectRoot, 'www/i18n/');
            var languageFolder = localesFolder + "/" + language;

            var lproj = "/" + language + ".lproj";
            var lprojFolder = path.join(languageFolder, lproj);
            if (fs.existsSync(lprojFolder)) {
                console.log(LOG_NAME + "Copying " + lprojFolder + " to " + platformRes);

                var platformlproj = platformRes + lproj;
                if (!fs.existsSync(platformlproj)) {
                    console.log(LOG_NAME + platformlproj + "does not exist, I will create it.");
                    fs.mkdirSync(platformlproj, {recursive: true} );
                }

                fs.copySync(lprojFolder, platformlproj);
                console.log(LOG_NAME + lprojFolder + "copied...")
            } else {
                console.log(LOG_NAME + lprojFolder + " not found, I will continue.")
            }

            var languagei18n = path.join(languageFolder, "/i18n/");
            if (fs.existsSync(languagei18n)) {
                console.log(LOG_NAME + "Copying " + languagei18n + " to " + wwwi18n);
                fs.copySync(languagei18n, wwwi18n);
                console.log(LOG_NAME + languagei18n + "copied...")
            } else {
                console.log(LOG_NAME + languagei18n + " not found, I will continue.")
            }
        });
    }
}
