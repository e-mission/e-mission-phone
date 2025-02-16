#!/usr/bin/env node

const fs = require('fs');

var copyInlinedFiles = function(inlineString) {
    var selConfigXml = "config."+inlineString+".xml";
    var selPkgJson = "package."+inlineString+".json";
    var selPkgLockJson = "package-lock."+inlineString+".json";
    fs.copyFileSync(selConfigXml, "config.xml");
    fs.copyFileSync(selPkgJson, "package.json");
    fs.copyFileSync(selPkgJson, "package-lock.json");

    console.log("Copied "+selConfigXml+" -> config.xml and "+
                selPkgJson + " -> package.json " +
                selPkgLockJson + " -> package-lock.json");
}

if (process.argv.length != 3) {
    console.log("process.argv = "+process.argv+
                " with length "+process.argv.length+
                " expected 3");
    process.exit(1);
} else {
    copyInlinedFiles(process.argv[2]);
}
