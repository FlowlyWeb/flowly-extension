import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';

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
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        pure_funcs: [], // Ne pas retirer les console.log
                        drop_console: false, // Garder les console.log
                    },
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
        ],
    },
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
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        })
    ],
    devtool: 'source-map',
    resolve: {
        ...baseConfig.resolve,
        fallback: {
            "path": 'path-browserify',
            "fs": false,
            "crypto": 'crypto-browserify',
            "buffer": 'buffer',
            "stream": 'stream-browserify',
            "util": 'util',
            "url": 'url',
            "assert": 'assert',
            "http": 'stream-http',
            "https": 'https-browserify',
            "os": 'os-browserify/browser',
            "process": 'process/browser'
        }
    }
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
        clean: true
    },
    externals: {
        'zx': 'commonjs zx',
        'node-fetch': 'commonjs node-fetch',
        'form-data': 'commonjs form-data'
    }
};

export default [extensionConfig, nodeConfig];