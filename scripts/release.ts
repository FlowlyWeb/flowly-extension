import {$, chalk, question} from 'zx';
import {readFile, writeFile} from 'fs/promises';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {config} from 'dotenv';
import * as fs from 'node:fs';
import AdmZip from "adm-zip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const result = config({ path: join(rootDir, '.env') });
if (result.error) {
    console.error(chalk.red('Error loading .env file:'), result.error);
    process.exit(1);
}

$.verbose = false;

type VersionType = 'major' | 'minor' | 'patch';
type Browser = 'firefox' | 'chrome' | 'both';
type Action = 'build' | 'release';

interface ReleaseOptions {
    skipGit: boolean;
    skipBuild: boolean;
    uploadOnly: boolean;
    browser: Browser;
    action: Action;
}

function parseArgs(): { versionType: VersionType | null, options: ReleaseOptions } {
    const args = process.argv.slice(2);
    const options: ReleaseOptions = {
        skipGit: args.includes('--no-git'),
        skipBuild: args.includes('--skip-build'),
        uploadOnly: args.includes('--upload-only'),
        browser: (args.find(arg => arg.startsWith('--browser='))?.split('=')[1] || 'both') as Browser,
        action: args.includes('build') ? 'build' : 'release'
    };

    const versionArg = args.find(arg => !arg.startsWith('--') && arg !== 'build') as VersionType | undefined;

    if (options.action === 'release' && (!versionArg || !['major', 'minor', 'patch'].includes(versionArg))) {
        console.log(chalk.yellow('Usage: npm run [build|release] [major|minor|patch] [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --no-git         Skip git operations'));
        console.log(chalk.gray('  --skip-build     Skip TypeScript build'));
        console.log(chalk.gray('  --upload-only    Only sign and upload current version'));
        console.log(chalk.gray('  --browser=<type> Target browser (firefox|chrome|both)'));
        process.exit(1);
    }

    return { versionType: versionArg || null, options };
}

async function validateEnvironment(skipGit: boolean, browser: Browser): Promise<void> {
    console.log(chalk.blue('🔍 Validating environment...'));

    const requiredEnvVars = {
        firefox: ['AMO_JWT_ISSUER', 'AMO_JWT_SECRET', 'UPLOAD_TOKEN', 'UPDATE_SERVER'],
        chrome: ['CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN', 'CHROME_EXTENSION_ID']
    };

    const varsToCheck = browser === 'both'
        ? [...requiredEnvVars.firefox, ...requiredEnvVars.chrome]
        : requiredEnvVars[browser];

    const missingVars = varsToCheck.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    if (!skipGit) {
        const status = await $`git status --porcelain`;
        if (status.stdout.trim() !== '') {
            const proceed = await question(
                chalk.yellow('⚠️  There are uncommitted changes. Continue? (y/N) ')
            );
            if (proceed.toLowerCase() !== 'y') {
                process.exit(1);
            }
        }
    }
}

async function getCurrentVersion(): Promise<string> {
    try {
        const manifestPath = join(rootDir, 'manifest.json');
        const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
        return manifest.version || '0.0.0';
    } catch (error) {
        console.error(chalk.red('Error reading current version:'), error);
        throw error;
    }
}

async function bumpVersion(type: VersionType): Promise<string> {
    const manifestPath = join(rootDir, 'manifest.json');
    const packagePath = join(rootDir, 'package.json');

    const manifestFirefoxPath = join(rootDir, 'manifest.firefox.json');
    const manifestChromePath = join(rootDir, 'manifest.chrome.json');

    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
    const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));

    const manifestFirefox = JSON.parse(await readFile(manifestFirefoxPath, 'utf-8'));
    const manifestChrome = JSON.parse(await readFile(manifestChromePath, 'utf-8'));

    const currentVersion = manifest.version || packageJson.version || '0.0.0';
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    let newVersion: string;
    switch (type) {
        case 'major': newVersion = `${major + 1}.0.0`; break;
        case 'minor': newVersion = `${major}.${minor + 1}.0`; break;
        case 'patch': newVersion = `${major}.${minor}.${patch + 1}`; break;
    }

    manifest.version = newVersion;
    packageJson.version = newVersion;

    manifestFirefox.version = newVersion;
    manifestChrome.version = newVersion

    await Promise.all([
        writeFile(manifestPath, JSON.stringify(manifest, null, 2)),
        writeFile(packagePath, JSON.stringify(packageJson, null, 2)),

        writeFile(manifestFirefoxPath, JSON.stringify(manifestFirefox, null, 2)),
        writeFile(manifestChromePath, JSON.stringify(manifestChrome, null, 2))
    ]);

    return newVersion;
}

async function buildExtension(browser: Browser) {
    console.log(chalk.blue(`🏗️  Building extension for ${browser}...`));
    try {
        if (browser === 'both' || browser === 'firefox') {
            console.log(chalk.gray('Building Firefox version...'));
            await $`npm run build:firefox`;
        }
        if (browser === 'both' || browser === 'chrome') {
            console.log(chalk.gray('Building Chrome version...'));
            await $`npm run build:chrome`;
        }
    } catch (error) {
        console.error(chalk.red('Build failed:'), error);
        throw error;
    }
}

async function findLatestXpi(): Promise<string> {
    const files = await $`cd dist/web-ext-artifacts && ls *.xpi`;
    const xpiFiles = files.stdout.trim().split('\n');
    if (xpiFiles.length === 0) throw new Error('No XPI file found');
    return "dist/firefox/web-ext-artifacts/" + xpiFiles[xpiFiles.length - 1];
}

async function signExtension(): Promise<string> {
    console.log(chalk.blue('📝 Signing Firefox extension...'));
    try {
        if (!fs.existsSync('dist/firefox')) {
            fs.mkdirSync('dist/firefox', {recursive: true});
        }

        await $`cd dist/firefox && npx web-ext sign --ignore-files="src/**" --ignore-files="scripts/**" --api-key=${process.env.AMO_JWT_ISSUER} --api-secret=${process.env.AMO_JWT_SECRET} --channel=unlisted`;

        const xpiPath = await findLatestXpi();
        return xpiPath;
    } catch (error) {
        console.error(chalk.red('Signing failed:'), error);
        throw error;
    }
}

async function packageChromeExtension(): Promise<string> {
    console.log(chalk.blue('📦 Packaging Chrome extension...'));
    const zipPath = 'dist/chrome/chrome.zip';

    try {
        const zip = new AdmZip();

        const distPath = join(process.cwd(), 'dist/chrome');

        function addDirectoryToZip(currentPath: string) {
            const files = fs.readdirSync(currentPath);

            for (const file of files) {
                const fullPath = join(currentPath, file);
                const relativePath = fullPath.substring(distPath.length + 1);

                if (fs.statSync(fullPath).isDirectory()) {
                    addDirectoryToZip(fullPath);
                } else {
                    zip.addLocalFile(fullPath, relativePath.split('/').slice(0, -1).join('/'));
                }
            }
        }

        addDirectoryToZip(distPath);

        // Sauvegarder le zip
        zip.writeZip(zipPath);

        return zipPath;
    } catch (error) {
        console.error(chalk.red('Chrome packaging failed:'), error);
        throw error;
    }
}

async function uploadFirefoxExtension(xpiPath: string, version: string) {
    console.log(chalk.blue('🚀 Uploading Firefox extension...'));
    const form = new FormData();
    form.append('version', version);
    form.append('extension', new Blob([await readFile(xpiPath)], { type: 'application/x-xpinstall' }));

    const response = await fetch(`${process.env.UPDATE_SERVER}/upload`, {
        method: 'POST',
        body: form,
        headers: {
            Authorization: `Bearer ${process.env.UPLOAD_TOKEN}`
        }
    });

    if (!response.ok) throw new Error(`Upload failed: ${await response.text()}`);
}

async function uploadChromeExtension(zipPath: string) {
    console.log(chalk.blue('🚀 Uploading to Chrome Web Store...'));

    const tokenResponse = await fetch('https://accounts.google.com/o/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.CHROME_CLIENT_ID!,
            client_secret: process.env.CHROME_CLIENT_SECRET!,
            refresh_token: process.env.CHROME_REFRESH_TOKEN!,
            grant_type: 'refresh_token'
        })
    });

    const { access_token } = await tokenResponse.json();

    const uploadResponse = await fetch(`https://www.googleapis.com/upload/chromewebstore/v1.1/items/${process.env.CHROME_EXTENSION_ID}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-goog-api-version': '2'
        },
        body: await readFile(zipPath)
    });

    if (!uploadResponse.ok) throw new Error(`Upload failed: ${await uploadResponse.text()}`);

    const publishResponse = await fetch(`https://www.googleapis.com/chromewebstore/v1.1/items/${process.env.CHROME_EXTENSION_ID}/publish`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-goog-api-version': '2',
            'Content-Length': '0'
        }
    });

    if (!publishResponse.ok) throw new Error(`Publish failed: ${await publishResponse.text()}`);
}

async function gitCommitAndTag(version: string, skipGit: boolean) {
    if (skipGit) {
        console.log(chalk.gray('📌 Skipping git operations...'));
        return;
    }

    console.log(chalk.blue('📌 Creating git commit and tag...'));
    try {
        await $`git add manifest.json package.json`;
        await $`git commit -m ${`chore: bump version to ${version}`}`;
        await $`git tag -a ${`v${version}`} -m ${`Version ${version}`}`;

        const proceed = await question(chalk.yellow('Push changes to remote? (Y/n) '));
        if (proceed.toLowerCase() !== 'n') {
            await $`git push`;
            await $`git push --tags`;
        }
    } catch (error) {
        console.error(chalk.red('Git operations failed:'), error);
        throw error;
    }
}

async function main() {
    try {
        const { versionType, options } = parseArgs();

        if (options.action === 'build') {
            await buildExtension(options.browser);
            console.log(chalk.green('✅ Build completed'));
            return;
        }

        await validateEnvironment(options.skipGit, options.browser);
        const currentVersion = await getCurrentVersion();
        let newVersion = currentVersion;

        console.log(chalk.blue('\nRelease configuration:'));
        console.log(chalk.gray(`Current version: ${currentVersion}`));
        console.log(chalk.gray(`Version type: ${versionType}`));
        console.log(chalk.gray(`Target browser: ${options.browser}`));
        console.log(chalk.gray(`Git operations: ${options.skipGit ? 'disabled' : 'enabled'}`));
        console.log(chalk.gray(`Build: ${options.skipBuild ? 'skipped' : 'enabled'}`));
        console.log(chalk.gray(`Upload only: ${options.uploadOnly ? 'yes' : 'no'}`));

        const proceed = await question(chalk.yellow('\nProceed with release? (Y/n) '));
        if (proceed.toLowerCase() === 'n') process.exit(0);

        if (!options.uploadOnly && versionType) {
            newVersion = await bumpVersion(versionType);
            console.log(chalk.green(`✅ Version bumped to ${newVersion}`));
        }

        if (!options.skipBuild) {
            await buildExtension(options.browser);
            console.log(chalk.green('✅ Build completed'));
        }

        if (['both', 'firefox'].includes(options.browser)) {
            const xpiPath = await signExtension();
            await uploadFirefoxExtension(xpiPath, newVersion);
            console.log(chalk.green('✅ Firefox upload completed'));
        }

        if (['both', 'chrome'].includes(options.browser)) {
            const zipPath = await packageChromeExtension();
            await uploadChromeExtension(zipPath);
            console.log(chalk.green('✅ Chrome upload completed'));
        }

        if (!options.skipGit && !options.uploadOnly) {
            await gitCommitAndTag(newVersion, options.skipGit);
            console.log(chalk.green('✅ Git operations completed'));
        }

        console.log(chalk.green(`\n🎉 Release ${newVersion} completed successfully!`));
    } catch (error) {
        console.error(chalk.red('\n❌ Release failed:'), error);
        process.exit(1);
    }
}

main();