#!/usr/bin/env node

const fs = require('fs');

var copyInlinedFiles = function(inlineString) {
    var selConfigXml = "config."+inlineString+".xml";
    fs.copyFileSync(selConfigXml, "config.xml");
    console.log("Copied "+selConfigXml+" -> config.xml");

    var packageJson = fs.readFileSync("package.json", { encoding: 'utf-8' });
    if (packageJson.indexOf(`"cordova-${inlineString}": {`) >= 0) {
        var otherInlineString = inlineString == 'cordovabuild' ? 'serve' : 'cordovabuild';
        packageJson = packageJson
                        .replace(`"cordova": {`, `"cordova-${otherInlineString}": {`)
                        .replace(`"cordova-${inlineString}": {`, `"cordova": {`);
        fs.writeFileSync("package.json", packageJson);
    }
    console.log('Set up package.json for ' + inlineString);
}

if (process.argv.length != 3) {
    console.log("process.argv = "+process.argv+
                " with length "+process.argv.length+
                " expected 3");
    process.exit(1);
} else {
    copyInlinedFiles(process.argv[2]);
}
