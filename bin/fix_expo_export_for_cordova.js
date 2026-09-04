#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Android aapt ignores assets directories whose name start with an underscore.
// Expo exports into `_expo/`, so we rename it to `expo-static` and rewrite all references accordingly.
const EXPO_DIR_FROM = '_expo';
const EXPO_DIR_TO = 'expo-static';

function read(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeIfChanged(filePath, nextContent) {
    const prevContent = read(filePath);
    if (prevContent !== nextContent) {
        fs.writeFileSync(filePath, nextContent, 'utf8');
        return true;
    }
    return false;
}

function rewriteRefs(content) {
    // Make exported asset URLs relative so they work in Cordova file/webview contexts,
    // then point them at the renamed static directory.
    return content
        .replace(/(["'(])\/_expo\//g, '$1_expo/')
        .replace(/(["'(])\/assets\//g, '$1assets/')
        .replace(/(["'])\/favicon\.ico/g, '$1favicon.ico')
        .replace(new RegExp(EXPO_DIR_FROM + '/', 'g'), EXPO_DIR_TO + '/');
}

function walkFiles(dir, exts, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkFiles(full, exts, out);
        else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
    }
    return out;
}

function main() {
    const outputDir = process.argv[2] || 'www';
    const absOutputDir = path.resolve(process.cwd(), outputDir);
    const indexHtmlPath = path.join(absOutputDir, 'index.html');

    if (!fs.existsSync(indexHtmlPath)) {
        console.error(`Could not find export index at ${indexHtmlPath}`);
        process.exit(1);
    }

    const fromDir = path.join(absOutputDir, EXPO_DIR_FROM);
    const toDir = path.join(absOutputDir, EXPO_DIR_TO);
    if (fs.existsSync(fromDir)) {
        fs.rmSync(toDir, { recursive: true, force: true });
        fs.renameSync(fromDir, toDir);
        console.log(`Renamed ${fromDir} -> ${toDir}`);
    }

    const targets = [indexHtmlPath, ...walkFiles(toDir, ['.js', '.css', '.map'])];

    let changedCount = 0;
    for (const filePath of targets) {
        if (writeIfChanged(filePath, rewriteRefs(read(filePath)))) {
            changedCount += 1;
            console.log(`Rewrote ${filePath}`);
        }
    }

    console.log(`Cordova export path fix complete. Files updated: ${changedCount}`);
}

main();
