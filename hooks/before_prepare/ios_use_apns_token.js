#!/usr/bin/env node

'use strict'

var fs = require('fs-extra');

const LOG_NAME = "Setting iOS push: FCM = false, APNS = true";
const CONF_FILE = "GoogleServicesInfo.plist";

module.exports = function (context) {
    const FCM_TOKEN_SETTING = new RegEx("<key>IS_GCM_ENABLED</key>(\n\\s*)<true></true>", "g");
    if (!ctx.opts.platforms.includes('ios')) return;
    if (fs.existsSync(confFile)) {
        console.log(LOG_NAME + confFile + " found, modifying it");
        var regEx = new RegExp(currentName, 'g');

        var data = fs.readFileSync(confFile, 'utf8');
        var replacedData = data.replace(regEx, "<key>IS_GCM_ENABLED</key>$1<false></false>");
        fs.writeFileSync(CONF_FILE, replacedData, 'utf8');
        console.log(LOG_NAME + confFile + " modified file written");
    } 
}
