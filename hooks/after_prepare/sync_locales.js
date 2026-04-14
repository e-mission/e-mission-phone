#!/usr/bin/env node

'use strict';

var fs = require('fs-extra');
var path = require('path');

const LOG_NAME = 'Syncing locales: ';
const FILTER_ITEMS = ['.git', '.github', 'LICENSE', 'README.md', 'ThirdPartyContributors.md', 'archived', 'index.html'];

function listLanguageFolders(localesFolder) {
    return fs.readdirSync(localesFolder)
        .filter(function (item) { return !FILTER_ITEMS.includes(item); })
        .filter(function (item) { return fs.lstatSync(path.join(localesFolder, item)).isDirectory(); });
}

function getIosResourcesFolder(projectRoot) {
    var iosPlatformFolder = path.join(projectRoot, 'platforms/ios');

    if (!fs.existsSync(iosPlatformFolder)) {
        return null;
    }

    var iosChildren = fs.readdirSync(iosPlatformFolder);
    for (var i = 0; i < iosChildren.length; i++) {
        var child = iosChildren[i];
        if (child === 'CordovaLib') {
            continue;
        }

        var resourcesFolder = path.join(iosPlatformFolder, child, 'Resources');
        if (fs.existsSync(resourcesFolder)) {
            return resourcesFolder;
        }
    }

    return null;
}

function syncAndroid(projectRoot, localesFolder, languageFolders) {
    var platformRes = path.join(projectRoot, 'platforms/android/app/src/main/res');

    if (!fs.existsSync(platformRes)) {
        console.log(LOG_NAME + 'android platform resources not found, skipping android sync.');
        return;
    }

    languageFolders.forEach(function (language) {
        var sourceValuesFolder = path.join(localesFolder, language, 'values-' + language);
        if (!fs.existsSync(sourceValuesFolder)) {
            return;
        }

        var targetValuesFolder = path.join(platformRes, 'values-' + language);
        fs.mkdirSync(targetValuesFolder, { recursive: true });
        fs.copySync(sourceValuesFolder, targetValuesFolder);
        console.log(LOG_NAME + 'android ' + language + ' copied.');
    });
}

function syncIos(projectRoot, localesFolder, languageFolders) {
    var iosResourcesFolder = getIosResourcesFolder(projectRoot);

    if (!iosResourcesFolder) {
        console.log(LOG_NAME + 'ios resources not found, skipping ios sync.');
        return;
    }

    languageFolders.forEach(function (language) {
        var sourceLprojFolder = path.join(localesFolder, language, language + '.lproj');
        if (!fs.existsSync(sourceLprojFolder)) {
            return;
        }

        var targetLprojFolder = path.join(iosResourcesFolder, language + '.lproj');
        fs.mkdirSync(targetLprojFolder, { recursive: true });
        fs.copySync(sourceLprojFolder, targetLprojFolder);
        console.log(LOG_NAME + 'ios ' + language + ' copied.');
    });
}

module.exports = function (context) {
    var projectRoot = context.opts.projectRoot;
    var localesFolder = path.join(projectRoot, 'locales');

    if (!fs.existsSync(localesFolder)) {
        console.log(LOG_NAME + 'locales folder not found, skipping sync.');
        return;
    }

    var languageFolders = listLanguageFolders(localesFolder);
    if (languageFolders.length === 0) {
        console.log(LOG_NAME + 'no language folders found, skipping sync.');
        return;
    }

    console.log(LOG_NAME + 'languages found -> ' + languageFolders.join(', '));
    syncAndroid(projectRoot, localesFolder, languageFolders);
    syncIos(projectRoot, localesFolder, languageFolders);
};
