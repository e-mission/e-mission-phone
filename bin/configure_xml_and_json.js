#!/usr/bin/env node

const fs = require('fs');

var copyInlinedFiles = function(inlineString) {
    [['config', 'xml'], ['package', 'json']].forEach(([prefix, ext]) => {
        const selFile = prefix+"."+inlineString+"."+ext;
        if (fs.existsSync(selFile)) {
            fs.copyFileSync(selFile, prefix+"."+ext);
            console.log("Copied "+selFile+" -> "+prefix+"."+ext);
        } else {
            console.log("File "+selFile+" does not exist, skipping");
        }
    });
}

if (process.argv.length != 3) {
    console.log("process.argv = "+process.argv+
                " with length "+process.argv.length+
                " expected 3");
    process.exit(1);
} else {
    copyInlinedFiles(process.argv[2]);
}
