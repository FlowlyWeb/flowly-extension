import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, 'src/')
        }
    }
};

function createBrowserConfig(target) {
    return {
        ...baseConfig,
        name: target,
        target: 'web',
        entry: {
            content: './src/content.ts'
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, `dist/${target}`),
            clean: {
                keep: /icons|styles|manifest\.json/
            }
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    {
                        from: "src/styles",
                        to: "styles"
                    },
                    {
                        from: "icons",
                        to: "icons"
                    },
                    {
                        from: `manifest.${target}.json`,
                        to: "manifest.json"
                    }
                ],
            })
        ],
        devtool: 'source-map'
    };
}

const nodeConfig = {
    ...baseConfig,
    name: 'node-scripts',
    target: 'node',
    entry: {
        release: './scripts/release.ts'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist-scripts'),
        clean: true,
        library: {
            type: 'module'
        }
    },
    experiments: {
        outputModule: true
    },
    externalsType: 'module',
    externals: {
        'zx': 'zx',
        'node-fetch': 'node-fetch',
        'form-data': 'form-data'
    }
};

export default (env) => {
    if (env.target === 'node-scripts') {
        return [nodeConfig];
    }
    const configs = [];
    if (!env.target || env.target === 'both' || env.target === 'firefox') {
        configs.push(createBrowserConfig('firefox'));
    }
    if (!env.target || env.target === 'both' || env.target === 'chrome') {
        configs.push(createBrowserConfig('chrome'));
    }
    return configs;
};
