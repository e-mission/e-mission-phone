#!/usr/bin/env node

var imageToCopy = process.argv[2]

var fs = require('fs-extra');
var path = require('path');
var klawSync = require('klaw-sync')

var androidPlatformsDir = path.resolve(__dirname, '../platforms/android/res'); 
var notificationIconsDir = path.resolve(__dirname, '../resources/android/' + imageToCopy);
var iconFileName = imageToCopy + ".png";

var copyAllIcons = function(iconDir) {
    var densityDirs = klawSync(iconDir, {nofile: true})
    // console.log("densityDirs = "+JSON.stringify(densityDirs));
    densityDirs.forEach(function(dDir) {
      var files = klawSync(dDir.path, {nodir: true});
      var fileNames = files.map(function(file) { return path.basename(file.path); });
      if (fileNames.indexOf(iconFileName) < 0) {
        console.log("No file "+iconFileName+" found in "+dDir.path+" skipping...");
      } else {
        var dirName = path.basename(dDir.path);
        var fileName = iconFileName;
        var srcName = path.join(androidPlatformsDir, dirName, fileName);
        var dstDirName = path.join(notificationIconsDir, dirName);
        fs.ensureDirSync(dstDirName);
        var dstName = path.join(dstDirName, fileName);
        console.log("About to copy file "+srcName+" -> "+dstName);
        fs.copySync(srcName, dstName);
      };
    });
};

copyAllIcons(androidPlatformsDir);
