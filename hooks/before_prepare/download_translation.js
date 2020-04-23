#!/usr/bin/env node

'use strict'

var child_process = require('child_process')
var fs = require('fs-extra');
var path = require('path');
const LOG_NAME = "Downloading locales: ";
const CONF_FILE = "bin/conf/translate_config.json";

module.exports = function (context) {
    var localesFolder = path.join(context.opts.projectRoot, 'locales/');
    var confFile = path.join(context.opts.projectRoot, CONF_FILE);

    // Checking if git is installed, return error if not. 
    try {
        child_process.execSync('which git', {'stdio': 'inherit' });
    } catch (err) {
        console.error(LOG_NAME + 'git not found, (' + err + ')');
        return;
    }
    
    var url = "";
    if (fs.existsSync(confFile)) {
        console.log(LOG_NAME + confFile + " found, I will extract translate repo from it.");
        var data = fs.readFileSync(confFile, 'utf8');
        url = JSON.parse(data).url;
    } else {
        console.log(LOG_NAME + confFile + " not found, I will extract translate repo from translation_config.json.sample.");
        confFile = confFile + ".sample";
        if (fs.existsSync(confFile)) {
            var data = fs.readFileSync(confFile, 'utf8');
            url = JSON.parse(data).url;
        } else {
            console.log(LOG_NAME + confFile + " not found, you can find a sample at bin/conf in the e-mission-phone repo.");
            return;
        }
    } 

    if (!fs.existsSync(localesFolder)) {
        console.log(LOG_NAME + "I will clone from " + url);
        child_process.execSync('git clone ' + url + ' ' + localesFolder, { 'timeout': 10000, 'stdio': 'inherit'});
    } else {
        child_process.execSync('git pull', { 'cwd': localesFolder, 'timeout': 10000, 'stdio': 'inherit' });
    }
}
