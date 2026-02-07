module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    moduleFileExtensions: ['js', 'json'],
    collectCoverageFrom: [
        'controllers/**/*.js',
        'services/**/*.js',
        'models/**/*.js',
        'utils/**/*.js',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    testTimeout: 30000,
    verbose: true
};
