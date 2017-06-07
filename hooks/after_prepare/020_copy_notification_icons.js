#!/usr/bin/env node

var fs = require('fs-extra');
var path = require('path');
var klawSync = require('klaw-sync')

var androidPlatformsDir = path.resolve(__dirname, '../../platforms/android/res'); 
var notificationIconsList = [
  path.resolve(__dirname, '../../resources/android/ic_mood_question'),
  path.resolve(__dirname, '../../resources/android/ic_question_answer')];

var copyAllIcons = function(iconDir) {
    var densityDirs = klawSync(iconDir, {nofile: true})
    // console.log("densityDirs = "+JSON.stringify(densityDirs));
    densityDirs.forEach(function(dDir) {
      var files = klawSync(dDir.path, {nodir: true});
      files.forEach(function(file) {
        var dirName = path.basename(dDir.path);
        var fileName = path.basename(file.path);
        var srcName = path.join(iconDir, dirName, fileName);
        var dstName = path.join(androidPlatformsDir, dirName, fileName);
        console.log("About to copy file "+srcName+" -> "+dstName);
        fs.copySync(srcName, dstName);
      });
    });
};

var copyIconsFromAllDirs = function() {
  notificationIconsList.forEach(function(iconDir) {
    console.log("About to copy icons from "+iconDir);
    copyAllIcons(iconDir);
  });
}

var platformList = process.env.CORDOVA_PLATFORMS;

if (platformList == undefined) {
  console.log("Testing by running standalone script, invoke anyway");
  copyIconsFromAllDirs();
} else {
  var platforms = platformList.split(",");
  if (platforms.indexOf('android') < 0) {
    console.log("Android platform not specified, skipping...");
  } else {
    copyIconsFromAllDirs();
  }
}
