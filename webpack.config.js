import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de base
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

// Configuration pour l'extension web
const extensionConfig = {
    ...baseConfig,
    name: 'extension',
    target: 'web',
    entry: {
        content: './src/content.ts'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
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
                    from: "manifest.json",
                    to: "manifest.json",
                    transform(content) {
                        const manifest = JSON.parse(content);
                        manifest.content_scripts[0].js = ['content.js'];
                        manifest.content_scripts[0].css = ['styles/styles.css'];
                        return JSON.stringify(manifest, null, 2);
                    }
                }
            ],
        })
    ],
    devtool: 'source-map'
};

// Configuration pour les scripts Node
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

export default [extensionConfig, nodeConfig];