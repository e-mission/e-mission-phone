#!/usr/bin/env node

'use strict'

var child_process = require('child_process')
var fs = require('fs-extra');
var path = require('path');
const LOG_NAME = "Downloading locales: ";

module.exports = function (context) {
    var localesFolder = path.join(context.opts.projectRoot, 'locales/');

    // Checking if git is installed, return error if not. 
    try {
        child_process.execSync('which git');
    } catch (err) {
        console.error(LOG_NAME + 'git not found, (' + err + ')');
        return;
    }

    if (!fs.existsSync(localesFolder)) {
        child_process.execSync('git clone https://github.com/e-mission/e-mission-translate ' + localesFolder, { 'timeout': 10000 });
    } else {
        var stdout = child_process.execSync('git pull', { 'cwd': localesFolder, 'timeout': 10000 });
        console.log(LOG_NAME + stdout);
    }
}