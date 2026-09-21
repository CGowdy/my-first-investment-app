import {randomBytes} from "node:crypto";
import {existsSync, readFileSync, writeFileSync} from "node:fs";

const environmentPath = ".env.local";
const currentContents = existsSync(environmentPath) ? readFileSync(environmentPath, "utf8") : "";
const configuredSecret = currentContents.match(/^AUTH_SECRET=(.*)$/m)?.[1]?.trim();

if (configuredSecret && configuredSecret.length >= 32) {
    console.log("Local AUTH_SECRET is already configured");
    process.exit(0);
}

const generatedSecret = randomBytes(32).toString("base64url");
const nextContents = /^AUTH_SECRET=.*$/m.test(currentContents)
    ? currentContents.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${generatedSecret}`)
    : `${currentContents.trimEnd()}${currentContents ? "\n" : ""}AUTH_SECRET=${generatedSecret}\n`;

writeFileSync(environmentPath, nextContents, {encoding: "utf8", mode: 0o600});
console.log("Configured a private local AUTH_SECRET in .env.local");
