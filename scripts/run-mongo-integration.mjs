import {spawnSync} from "node:child_process";

function runNodeScript(script, args = []) {
    return spawnSync(process.execPath, [script, ...args], {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
    });
}

let exitCode = 1;

try {
    const seed = runNodeScript("scripts/seed-mongo-integration.mjs");
    if (seed.status !== 0) {
        exitCode = seed.status ?? 1;
    } else {
        const tests = runNodeScript("node_modules/@playwright/test/cli.js", [
            "test",
            "--project=mongo-chromium",
        ]);
        exitCode = tests.status ?? 1;
    }
} finally {
    const cleanup = runNodeScript("scripts/cleanup-mongo-integration.mjs");
    if (cleanup.status !== 0 && exitCode === 0) {
        exitCode = cleanup.status ?? 1;
    }
}

process.exitCode = exitCode;
