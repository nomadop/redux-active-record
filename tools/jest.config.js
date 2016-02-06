const config = {
  scriptPreprocessor: './preprocessor.js',
  testDirectoryName: 'tests',
  testPathDirs: [
    'tests',
  ],
  unmockedModulePathPatterns: [
    '<rootDir>/node_modules/redux',
    '<rootDir>/node_modules/fbjs',
    '<rootDir>/src',
  ],
  setupTestFrameworkScriptFile: './tools/testsetup.js',
  verbose: true,
  preprocessCachingDisabled: true,
  collectCoverage: true,
};

export default config;
