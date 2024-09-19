const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function findFilePathsByFilename(directory, filename) {
	const files = fs.readdirSync(directory);
	const filePaths = [];

	for (const file of files) {
		const filePath = path.join(directory, file);
		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
			// Recursively search in subdirectories
			const subdirectoryFilePaths = findFilePathsByFilename(filePath, filename);
			filePaths.push(...subdirectoryFilePaths);
		} else if (stats.isFile() && file === filename) {
			// If the file matches the filename, add its path to the result
			filePaths.push(filePath);
		}
	}
	return filePaths;
}

function logTarget(directory, logmsg) {
    const grepstmt = `grep -r IPHONEOS_DEPLOYMENT_TARGET ${directory} | sort | uniq`
    exec(grepstmt, (err, stdout, stderr) => {
      if (err) {
        console.log(`${logmsg}, ${grepstmt}:\n`, stderr)
        return;
      }

      // the *entire* stdout and stderr (buffered)
      console.log(`${logmsg}, ${grepstmt}:\n`, stdout);
    });
}

module.exports = function(context) {
    if (context.opts.verbose) console.log(context);

    if (context.opts.verbose) logTarget("platforms/ios", "before patching");

    const paths1 = findFilePathsByFilename('.', 'project.pbxproj');
    const paths2 = findFilePathsByFilename('.', 'Pods.xcodeproj');
    const paths = paths1.concat(paths2)

    console.log('Apply patch to', paths);

    for (let path of paths) {
        let content = fs.readFileSync(path, { encoding: 'utf-8' });
        content = content.replace(/IPHONEOS_DEPLOYMENT_TARGET = [0-9]+.0;/g, 'IPHONEOS_DEPLOYMENT_TARGET = 13.0;');
        fs.writeFileSync(path, content);
    }

    console.log('Done setting IPHONEOS_DEPLOYMENT_TARGET');

    if (context.opts.verbose) logTarget("platforms/ios", "after patching");
}


