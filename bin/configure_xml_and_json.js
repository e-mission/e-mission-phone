#!/usr/bin/env node

const fs = require('fs');

fs.copyFileSync("config.serve.xml", "config.xml");
fs.copyFileSync("package.serve.json", "package.json");

console.log("Changed config.xml and package.json to ignore all plugins and engines");
