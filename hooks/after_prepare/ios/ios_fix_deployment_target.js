// based on https://github.com/apache/cordova-ios/issues/1379#issuecomment-2963581215
// to work around the problem described in that issue

const fs = require('fs');
const path = require('path');

const MIN_TARGET_VERSION = '12.0';

console.log(`Hook to set IPHONEOS_DEPLOYMENT_TARGET to ${MIN_TARGET_VERSION} in all project.pbxproj and Pods.xcodeproj files`);

function findFilePathsByFilename(directory, filename) {
    const files = fs.readdirSync(directory);
    const filePaths = [];
    for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            const subdirectoryFilePaths = findFilePathsByFilename(filePath, filename);
            filePaths.push(...subdirectoryFilePaths);
        } else if (stats.isFile() && file === filename) {
            filePaths.push(filePath);
        }
    }
    return filePaths;
}

const paths1 = findFilePathsByFilename('.', 'project.pbxproj');
const paths2 = findFilePathsByFilename('.', 'Pods.xcodeproj');
const paths = paths1.concat(paths2);
console.log('Apply patch to', paths);
for (let path of paths) {
    let content = fs.readFileSync(path, { encoding: 'utf-8' });
    content = content.replace(/IPHONEOS_DEPLOYMENT_TARGET = [0-9]+.0;/g, `IPHONEOS_DEPLOYMENT_TARGET = ${MIN_TARGET_VERSION};`);
    fs.writeFileSync(path, content);
}

console.log('Done setting IPHONEOS_DEPLOYMENT_TARGET');