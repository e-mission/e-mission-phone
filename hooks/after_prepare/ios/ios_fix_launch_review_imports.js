const fs = require('fs');
const path = require('path');

const targets = [
  path.join('platforms', 'ios', 'App', 'Plugins', 'cordova-launch-review', 'UIWindow+DismissNotification.h'),
  path.join('platforms', 'ios', 'App', 'Plugins', 'cordova-launch-review', 'UIWindow+DismissNotification.m'),
];

function ensurePrefix(filePath, prefix) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing file ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
  if (content.includes(prefix.trim())) {
    console.log(`No changes needed for ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, `${prefix}${content}`);
  console.log(`Patched imports in ${filePath}`);
}

console.log('Hook to patch cordova-launch-review iOS imports for Xcode module builds');

ensurePrefix(
  targets[0],
  '#import <Foundation/Foundation.h>\n#import <UIKit/UIKit.h>\n\n'
);

ensurePrefix(
  targets[1],
  '#import <dispatch/dispatch.h>\n'
);

console.log('Done patching cordova-launch-review imports');
