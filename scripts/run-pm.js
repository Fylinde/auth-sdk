#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");

const command = process.argv[2];

const getPackageManager = () => {
    if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
    if (fs.existsSync("yarn.lock")) return "yarn";
    return "npm"; // Default to npm
};

const pm = getPackageManager();
console.log(`\n🔧 Running '${command}' using ${pm}...\n`);

const commands = {
    build: `${pm} run build`,
    clean: `${pm} run clean`,
    "copy-files": `${pm} run copy-files`,
};

if (!commands[command]) {
    console.error(`\n❌ Unknown command: ${command}\n`);
    process.exit(1);
}

execSync(commands[command], { stdio: "inherit" });
