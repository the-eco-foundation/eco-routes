/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: 'node',
  rootDir: './scripts',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
}
