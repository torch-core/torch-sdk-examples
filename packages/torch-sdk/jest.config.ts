const path = require('path')

const config = {
  coverageProvider: 'v8',
  preset: 'ts-jest',
  transform: {
    '\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    '\\.m?jsx?$': [
      'babel-jest',
      {
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
  transformIgnorePatterns: [
    `node_modules/(?!graphql-request|@babel/runtime/helpers/esm)/`,
  ],
  testEnvironment: 'jest-environment-node',
}

module.exports = config
