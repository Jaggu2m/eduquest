/**
 * jest.config.js
 * Configure Jest for an ES-module Node.js project.
 * Uses the "node" test environment and transforms ES modules via the
 * experimental VM-module runner (requires --experimental-vm-modules).
 */
export default {
  testEnvironment: 'node',
  // Transform nothing — rely on Node's native ESM support
  transform: {},
  // Only pick up files in __tests__ or files ending in .test.js / .spec.js
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  // Ignore node_modules and generated Prisma client output
  testPathIgnorePatterns: ['/node_modules/', '/src/generated/'],
  // Show verbose output per test
  verbose: true,
  // Fail the suite if coverage drops below thresholds (optional, enable when coverage is mature)
  // coverageThreshold: { global: { lines: 70 } },
};
