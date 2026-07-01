// Fix for Xcode 26 build errors in cordova-plugin-advanced-http
// AFNetworking uses private header <netinet6/in6.h> which is not allowed with strict module checks
// SDNetworkActivityIndicator uses UIKit types without importing UIKit
//
// After `cordova prepare`, plugin source files are copied flat into:
//   platforms/ios/App/Plugins/cordova-plugin-advanced-http/
// (no subdirectories, regardless of the source layout in the plugin)
//
// Based on fix described in: https://github.com/e-mission/e-mission-docs/issues/1144

const fs = require('fs');
const path = require('path');

console.log('Hook: Fixing cordova-plugin-advanced-http for Xcode 26 compatibility');

// Fix AFNetworking files: remove private #import <netinet6/in6.h>
// The fix comes from: https://github.com/e-mission/e-mission-docs/issues/1144#issuecomment-4833815337
const pluginDir = path.join('platforms', 'ios', 'App', 'Plugins', 'cordova-plugin-advanced-http');
if (!fs.existsSync(pluginDir)) {
    console.log(`Plugin directory not found: ${pluginDir}`);
} else {
    const allFiles = fs.readdirSync(pluginDir).filter(f => /\.(m|h)$/.test(f));
    console.log(`Found ${allFiles.length} plugin files to check`);

    for (const file of allFiles) {
        const filePath = path.join(pluginDir, file);
        let content = fs.readFileSync(filePath, { encoding: 'utf-8' });

        // Fix 1: remove private AFNetworking header; <netinet/in.h> and <arpa/inet.h> (already present) suffice
        if (content.includes('#import <netinet6/in6.h>')) {
            content = content.replace('#import <netinet6/in6.h>\n', '');
            fs.writeFileSync(filePath, content);
            console.log(`Fixed AFNetworking netinet6 import in: ${filePath}`);
        }

        // Fix 2: add UIKit import to SDNetworkActivityIndicator.h (uses UIApplication)
        // The fix comes from: https://github.com/e-mission/e-mission-docs/issues/1144#issuecomment-4846939083
        if (file === 'SDNetworkActivityIndicator.h' && !content.includes('#import <UIKit/UIKit.h>')) {
            content = content.replace('#import <Foundation/Foundation.h>', '#import <Foundation/Foundation.h>\n#import <UIKit/UIKit.h>');
            fs.writeFileSync(filePath, content);
            console.log(`Fixed UIKit import in: ${filePath}`);
        }
    }
}

console.log('Hook: Done fixing cordova-plugin-advanced-http for Xcode 26 compatibility');
