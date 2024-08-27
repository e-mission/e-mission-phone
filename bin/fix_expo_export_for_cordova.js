#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function rewriteHtml(content) {
    // Make exported asset URLs relative so they work in Cordova file/webview contexts.
    return content
        .replace(/(["'])\/_expo\//g, '$1_expo/')
        .replace(/(["'])\/assets\//g, '$1assets/')
        .replace(/(["'])\/favicon\.ico/g, '$1favicon.ico');
}

function rewriteJs(content) {
    // Expo asset modules often embed absolute asset roots that break under file://.
    return content
        .replace(/(["'])\/_expo\//g, '$1_expo/')
        .replace(/(["'])\/assets\//g, '$1assets/');
}

function main() {
    const outputDir = process.argv[2] || 'www';
    const absOutputDir = path.resolve(process.cwd(), outputDir);
    const indexHtmlPath = path.join(absOutputDir, 'index.html');
    const jsDir = path.join(absOutputDir, '_expo', 'static', 'js', 'web');

    if (!fs.existsSync(indexHtmlPath)) {
        console.error(`Could not find export index at ${indexHtmlPath}`);
        process.exit(1);
    }

    let changedCount = 0;

    const html = read(indexHtmlPath);
    if (writeIfChanged(indexHtmlPath, rewriteHtml(html))) {
        changedCount += 1;
        console.log(`Rewrote ${indexHtmlPath}`);
    }

    if (fs.existsSync(jsDir)) {
        for (const fileName of fs.readdirSync(jsDir)) {
            if (!fileName.endsWith('.js')) continue;
            const filePath = path.join(jsDir, fileName);
            const nextJs = rewriteJs(read(filePath));
            if (writeIfChanged(filePath, nextJs)) {
                changedCount += 1;
                console.log(`Rewrote ${filePath}`);
            }
        }
    }

    console.log(`Cordova export path fix complete. Files updated: ${changedCount}`);
}

main();
