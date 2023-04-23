/*
 * A hook to change provider in order to match with the application name.
 */

var fs = require('fs');
var path = require('path');
var et = require('elementtree');

const LOG_NAME = "Changing compile to implementation ";

var changeCompileToImplementation = function (file) {
    if (fs.existsSync(file)) {
        fs.readFile(file, 'utf8', function (err, data) {
            var result = data.replace("compile", "implementation");
            fs.writeFile(file, result, 'utf8', function (err) {
                if (err) throw new Error(LOG_NAME + 'Unable to write into ' + file + ': ' + err);
                console.log(LOG_NAME + "" + file + " updated...")
            });
        });
    } else {
        console.error("Could not find file "+file+" skipping compile -> implementation change");
    }
}

module.exports = function (context) {
    // If Android platform is not installed, don't even execute
    if (!context.opts.platforms.includes('android')) return;

    var config_xml = path.join(context.opts.projectRoot, 'config.xml');
    var data = fs.readFileSync(config_xml).toString();
    // If no data then no config.xml
    if (data) {
        var etree = et.parse(data);
        console.log(LOG_NAME + "Retrieving application name...")
        var applicationName = etree._root.attrib.id;
        console.info(LOG_NAME + "Your application is " + applicationName);
        const splitParts = applicationName.split(".")
        var lastApplicationPart = splitParts[splitParts.length - 1];

        var platformRoot = path.join(context.opts.projectRoot, 'platforms/android/')

        console.log(LOG_NAME + "Updating barcode scanner gradle...");
        var gradleFile = path.join(platformRoot, 'phonegap-plugin-barcodescanner/'+lastApplicationPart+'-barcodescanner.gradle');
        changeCompileToImplementation(gradleFile);
    } else {
        throw new Error(LOG_NAME + "Could not retrieve application name.");
    }
}
