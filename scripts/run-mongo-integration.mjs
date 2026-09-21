import {spawnSync} from "node:child_process";

function runNodeScript(script, args = [], environment = process.env) {
    return spawnSync(process.execPath, [script, ...args], {
        cwd: process.cwd(),
        env: environment,
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
            "--workers=1",
        ], {
            ...process.env,
            AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-integration-only-session-secret",
        });
        exitCode = tests.status ?? 1;
    }
} finally {
    const cleanup = runNodeScript("scripts/cleanup-mongo-integration.mjs");
    if (cleanup.status !== 0 && exitCode === 0) {
        exitCode = cleanup.status ?? 1;
    }
}

process.exitCode = exitCode;
