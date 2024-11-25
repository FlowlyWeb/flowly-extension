import {$, chalk, question} from 'zx';
import {readFile, writeFile} from 'fs/promises';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {config} from 'dotenv';
import * as fs from 'node:fs';
import {existsSync} from 'node:fs';

// Get the root directory of the project
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load environment variables from .env file
const result = config({ path: join(rootDir, '.env') });

if (result.error) {
    console.error(chalk.red('Error loading .env file:'), result.error);
    process.exit(1);
}

// Don't show verbose output to avoid cluttering the console
$.verbose = false;

// All versions are in the format major.minor.patch, the user can select one of these types
type VersionType = 'major' | 'minor' | 'patch';

// Options for the release script, can be set via command line flags
interface ReleaseOptions {
    skipGit: boolean;
    skipBuild: boolean;
    uploadOnly: boolean;
}

/**
 * Parse command line arguments and return the version type and options
 * @returns {VersionType} The version type to bump
 * @returns {ReleaseOptions} The options for the release script
 */
function parseArgs(): { versionType: VersionType, options: ReleaseOptions } {
    const args = process.argv.slice(2);
    const options: ReleaseOptions = {
        skipGit: args.includes('--no-git'),
        skipBuild: args.includes('--skip-build'),
        uploadOnly: args.includes('--upload-only')
    };

    const versionArg = args.find(arg => !arg.startsWith('--')) as VersionType | undefined;

    if (!versionArg || !['major', 'minor', 'patch'].includes(versionArg)) {
        console.log(chalk.yellow('Usage: npm run release [major|minor|patch] [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --no-git       Skip git operations'));
        console.log(chalk.gray('  --skip-build   Skip TypeScript build'));
        console.log(chalk.gray('  --upload-only  Only sign and upload current version'));
        process.exit(1);
    }

    return { versionType: versionArg, options };
}

/**
 * Validate the environment before starting the release process
 * @param {boolean} skipGit Whether to skip git operations
 * @throws {Error} If any required environment variables are missing
 */
async function validateEnvironment(skipGit: boolean): Promise<void> {
    console.log(chalk.blue('🔍 Validating environment...'));

    const requiredEnvVars = [
        'AMO_JWT_ISSUER',
        'AMO_JWT_SECRET',
        'UPLOAD_TOKEN',
        'UPDATE_SERVER'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
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

/**
 * Get the current version from the manifest file
 * @returns {string} The current version
 * @throws {Error} If the manifest file is missing or invalid
 */
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

/**
 * Bump the version in the manifest file
 * @param {VersionType} type The type of version to bump
 * @returns {string} The new version
 * @throws {Error} If the version format is invalid
 */
async function bumpVersion(type: VersionType): Promise<string> {
    const manifestPath = join(rootDir, 'manifest.json');
    const packagePath = join(rootDir, 'package.json');
    let manifest: any;
    let packageJson: any;

    try {
        // Lire les deux fichiers
        manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
        packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));

        const currentVersion = manifest.version || packageJson.version || '0.0.0';
        const [major, minor, patch] = currentVersion.split('.').map(Number);

        if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
            throw new Error(`Invalid version format: ${currentVersion}`);
        }

        // Calculer la nouvelle version
        let newVersion: string;
        switch (type) {
            case 'major':
                newVersion = `${major + 1}.0.0`;
                break;
            case 'minor':
                newVersion = `${major}.${minor + 1}.0`;
                break;
            case 'patch':
                newVersion = `${major}.${minor}.${patch + 1}`;
                break;
        }

        // Mettre à jour les deux fichiers
        manifest.version = newVersion;
        packageJson.version = newVersion;

        // Écrire les modifications
        await Promise.all([
            writeFile(manifestPath, JSON.stringify(manifest, null, 2)),
            writeFile(packagePath, JSON.stringify(packageJson, null, 2))
        ]);

        return newVersion;
    } catch (error) {
        console.error(chalk.red('Error bumping version:'), error);
        throw error;
    }
}

/**
 * Build the extension using npm run build
 * @throws {Error} If the build fails
 */
async function buildExtension() {
    console.log(chalk.blue('🏗️  Building extension...'));
    try {
        await $`npm run build:prod`;
    } catch (error) {
        console.error(chalk.red('Build failed:'), error);
        throw error;
    }
}

/**
 * Prepare the dist directory by copying necessary files and updating the manifest
 * @throws {Error} If the dist directory is missing or any file copy operation fails
 */
async function prepareDistDirectory() {
    console.log(chalk.blue('🔧 Preparing dist directory...'));

    try {
        if (!existsSync('dist')) {
            console.log(chalk.red('❌ Dist directory not found. Please run build first.'));
            throw new Error('Dist directory not found');
        }

        // Plus besoin de copier les fichiers car Webpack le fait déjà
        console.log(chalk.green('✅ Build directory ready'));
    } catch (error) {
        console.error(chalk.red('Error preparing dist directory:'), error);
        throw error;
    }
}

/**
 * Find the latest XPI file in the web-ext-artifacts directory
 * @returns {string} The path to the latest XPI file
 * @throws {Error} If no XPI file is found
 */
async function findLatestXpi(): Promise<string> {

    const files = await $`cd dist/web-ext-artifacts && ls *.xpi`;
    const xpiFiles = files.stdout.trim().split('\n');

    if (xpiFiles.length === 0) {
        throw new Error('No XPI file found');
    }

    // Return the latest XPI file
    return "dist/web-ext-artifacts/" + xpiFiles[xpiFiles.length - 1];

}

/**
 * Sign the extension using web-ext sign command and Firefox credentials
 * @returns {string} The path to the signed XPI file
 * @throws {Error} If the sign operation fails
 * @throws {Error} If the XPI file is not found
 * @throws {Error} If the dist directory is missing
 */
async function signExtension(): Promise<string> {
    console.log(chalk.blue('📝 Signing extension... (estimated time: 5-10 minutes)'));
    try {

        console.log(chalk.gray('Current directory:', process.cwd()));
        console.log(chalk.gray('Checking for dist directory...'));

        if (!fs.existsSync('dist')) {
            console.log(chalk.yellow('⚠️  dist directory not found, creating it...'));
            // @ts-ignore
            fs.mkdir('dist', {recursive: true});
        }

        await prepareDistDirectory();

        console.log(chalk.gray('Running web-ext sign command...'));
        console.log(chalk.gray(`Using credentials: JWT_ISSUER=${process.env.AMO_JWT_ISSUER?.slice(0, 4)}... JWT_SECRET=${process.env.AMO_JWT_SECRET?.slice(0, 4)}...`));

        const result = await $`cd dist && npx web-ext sign --ignore-files="src/**" --ignore-files="scripts/**" --api-key=${process.env.AMO_JWT_ISSUER} --api-secret=${process.env.AMO_JWT_SECRET} --channel=unlisted`;

        console.log(chalk.gray('Command output:', result.stdout));

        console.log(chalk.gray('Locating signed XPI...'));
        const xpiPath = await findLatestXpi();
        console.log(chalk.gray(`Found XPI at: ${xpiPath}`));

        if (!existsSync(xpiPath)) {
            throw new Error(`XPI file not found at: ${xpiPath}`);
        }

        return xpiPath;
    } catch (error) {
        console.error(chalk.red('\nDetailed error information:'));
        // @ts-ignore
        if (error.stdout) { // @ts-ignore
            console.error(chalk.yellow('stdout:', error.stdout));
        }
        // @ts-ignore
        if (error.stderr) { // @ts-ignore
            console.error(chalk.red('stderr:', error.stderr));
        }
        throw error;
    }
}

/**
 * Upload the signed extension to the update server
 * @param {string} xpiPath The path to the signed XPI file
 * @param {string} version The version of the extension
 * @throws {Error} If the upload fails
 */
async function uploadExtension(xpiPath: string, version: string) {
    console.log(chalk.blue('🚀 Uploading extension...'));
    const form = new FormData();
    form.append('version', version);
    form.append('extension', new Blob([await readFile(xpiPath)], { type: 'application/x-xpinstall' }));

    try {
        const response = await fetch(`${process.env.UPDATE_SERVER}/upload`, {
            method: 'POST',
            body: form,
            headers: {
                Authorization: `Bearer ${process.env.UPLOAD_TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${await response.text()}`);
        }
    } catch (error) {
        console.error(chalk.red('Upload failed:'), error);
        throw error;
    }
}

/**
 * Create a git commit and tag for the new version
 * @param {string} version The new version
 * @param {boolean} skipGit Whether to skip git operations
 * @throws {Error} If the git operations fail
 */
async function gitCommitAndTag(version: string, skipGit: boolean) {
    if (skipGit) {
        console.log(chalk.gray('📌 Skipping git operations...'));
        return;
    }

    console.log(chalk.blue('📌 Creating git commit and tag...'));
    try {
        await $`git add manifest.json`;
        await $`git commit -m ${`chore: bump version to ${version}`}`;
        await $`git tag -a ${`v${version}`} -m ${`Version ${version}`}`;

        const proceed = await question(
            chalk.yellow('Push changes to remote? (Y/n) ')
        );
        if (proceed.toLowerCase() !== 'n') {
            await $`git push`;
            await $`git push --tags`;
        }
    } catch (error) {
        console.error(chalk.red('Git operations failed:'), error);
        throw error;
    }
}

/**
 * Main function to orchestrate the release process
 * @throws {Error} If any step of the release process fails
 */
async function main() {
    try {
        const { versionType, options } = parseArgs();
        await validateEnvironment(options.skipGit);

        const currentVersion = await getCurrentVersion();

        console.log(chalk.blue('\nRelease configuration:'));
        console.log(chalk.gray(`Current version: ${currentVersion}`));
        console.log(chalk.gray(`Version type: ${versionType}`));
        console.log(chalk.gray(`Git operations: ${options.skipGit ? 'disabled' : 'enabled'}`));
        console.log(chalk.gray(`Build: ${options.skipBuild ? 'skipped' : 'enabled'}`));
        console.log(chalk.gray(`Upload only: ${options.uploadOnly ? 'yes' : 'no'}`));

        const proceed = await question(
            chalk.yellow('\nProceed with release? (Y/n) ')
        );
        if (proceed.toLowerCase() === 'n') {
            process.exit(0);
        }

        let newVersion = currentVersion;
        if (!options.uploadOnly) {
            newVersion = await bumpVersion(versionType);
            console.log(chalk.green(`✅ Version bumped to ${newVersion}`));
        }

        if (!options.skipBuild) {
            try {
                await buildExtension();
                console.log(chalk.green('✅ Build completed'));
            } catch (error) {
                if (!options.uploadOnly) {
                    throw error;
                }
                console.log(chalk.yellow('⚠️  Build failed but continuing due to --upload-only flag'));
            }
        } else {
            console.log(chalk.gray('⏩ Build skipped'));
        }

        let xpiPath = '';

        if (!options.uploadOnly) {
            xpiPath = await signExtension();
            console.log(chalk.green('✅ Signing completed'));
        } else {
            console.log(chalk.gray('⏩ Signing skipped'));
            xpiPath = await findLatestXpi();
        }

        await uploadExtension(xpiPath, newVersion);
        console.log(chalk.green('✅ Upload completed'));

        if (!options.skipGit && !options.uploadOnly) {
            await gitCommitAndTag(newVersion, options.skipGit);
            if (!options.skipGit) {
                console.log(chalk.green('✅ Git operations completed'));
            }
        }

        console.log(chalk.green(`\n🎉 Release ${newVersion} completed successfully!`));
    } catch (error) {
        console.error(chalk.red('\n❌ Release failed:'), error);
        process.exit(1);
    }
}

// Run the main function
main();