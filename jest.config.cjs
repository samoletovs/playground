module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  transform: {},
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  coverageReporters: ['text', 'html', 'lcov'],
  coverageThreshold: {
    global: { lines: 80, statements: 80, functions: 80 },
    './*.html': { lines: 80 },
  },
};
