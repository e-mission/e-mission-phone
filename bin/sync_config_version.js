#!/usr/bin/env node
// Syncs config.xml's version/versionCode with package.json's version.
// Invoked automatically by `npm version <major|minor|patch>` via the "version" npm script.
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const pkg = require(path.join(rootDir, 'package.json'));
const configPath = path.join(rootDir, 'config.xml');

let config = fs.readFileSync(configPath, 'utf8');

const versionCodeMatch = config.match(/android-versionCode="(\d+)"/);
if (!versionCodeMatch) {
    throw new Error('Could not find android-versionCode in config.xml');
}
const newVersionCode = String(Number(versionCodeMatch[1]) + 1);

config = config
    .replace(/android-versionCode="\d+"/, `android-versionCode="${newVersionCode}"`)
    .replace(/ios-CFBundleVersion="\d+"/, `ios-CFBundleVersion="${newVersionCode}"`)
    .replace(/version="[^"]+"/, `version="${pkg.version}"`);

fs.writeFileSync(configPath, config);
console.log(`Updated config.xml to version ${pkg.version} (versionCode ${newVersionCode})`);
