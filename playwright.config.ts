import {defineConfig, devices} from "@playwright/test";

const configuredBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
const baseURL = configuredBaseUrl ?? 'http://127.0.0.1:3000';
const mongoTests = /mongo.*\.spec\.ts/;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    reporter: process.env.CI
        ? [['github'], ['html', {open: 'never'}]]
        : [['list']],
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    webServer: configuredBaseUrl
        ? undefined
        : {
            command: 'npm run dev',
            env: {ENVIRONMENT: 'mock'},
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
    projects: [
        {
            name: 'chromium',
            testIgnore: mongoTests,
            use: {...devices['Desktop Chrome']},
        },
        {
            name: 'firefox',
            testIgnore: mongoTests,
            use: {...devices['Desktop Firefox']},
        },
        {
            name: 'webkit',
            testIgnore: mongoTests,
            use: {...devices['Desktop Safari']},
        },
        {
            name: 'mobile-chrome',
            testIgnore: mongoTests,
            use: {...devices['Pixel 5']},
        },
        {
            name: 'mobile-safari',
            testIgnore: mongoTests,
            use: {...devices['iPhone 12']},
        },
        {
            name: 'mongo-chromium',
            testMatch: mongoTests,
            use: {...devices['Desktop Chrome']},
        },
    ],
});
