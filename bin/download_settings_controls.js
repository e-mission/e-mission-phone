#!/usr/bin/env node

var https = require('https');
var fs = require('fs');

var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

download("https://raw.githubusercontent.com/e-mission/e-mission-data-collection/master/www/ui/ionic/js/collect-settings.js", "www/js/control/collect-settings.js", function(message) {
    console.log("Data collection settings updated");
});

download("https://raw.githubusercontent.com/e-mission/cordova-server-sync/master/www/ui/ionic/js/sync-settings.js", "www/js/control/sync-settings.js", function(message) {
    console.log("Sync collection settings updated");
});

download("https://raw.githubusercontent.com/e-mission/e-mission-transition-notify/master/www/ui/ionic/js/transition-notify-settings.js", "www/js/control/transition-notify-settings.js", function(message) {
    console.log("Transition notify settings updated");
});
