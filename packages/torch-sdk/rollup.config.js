const typescript = require('@rollup/plugin-typescript')
const { defineConfig } = require('rollup')
const terser = require('@rollup/plugin-terser')
const babel = require('@rollup/plugin-babel')
const peerDepsExternal = require('rollup-plugin-peer-deps-external')

const isProduction = process.env.NODE_ENV === 'production'
console.log('Current env: ', process.env.NODE_ENV)

module.exports = defineConfig({
  input: 'src/index.ts',
  external: ['@ton/core', '@ton/crypto', '@ton/sandbox', '@ton/ton'],
  output: [
    {
      file: 'dist/sdk.esm.js',
      format: 'esm',
      sourcemap: false,
    },
    {
      file: 'dist/sdk.cjs.js',
      format: 'cjs',
      sourcemap: false,
    },
    {
      file: 'dist/sdk.umd.js',
      format: 'umd',
      name: 'TorchSDK',
      sourcemap: false,
    },
    {
      file: 'dist/sdk.min.js',
      format: 'iife',
      name: 'TorchSDK',
      plugins: isProduction ? [terser()] : [],
      sourcemap: false,
    },
  ],
  plugins: [
    peerDepsExternal(),
    typescript({
      tsconfig: './tsconfig.json',
      typescript: require('typescript'),
    }),
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts'],
      include: ['src/**/*'],
      exclude: 'node_modules/**',
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
            targets: '> 0.25%, not dead',
          },
        ],
      ],
    }),
    isProduction &&
      terser({
        compress: {
          drop_console: true,
        },
      }),
  ].filter(Boolean),
})
