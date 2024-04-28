module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/platforms/",
    "/plugins/",
    "/lib/",
  ],
  preset: 'react-native',
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!((enketo-transformer/dist/enketo-transformer/web)|(jest-)?react-native(-.*)?|@react-native(-community)?)/)",
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleDirectories: ["node_modules", "src"],
  globals: {"__DEV__": false},
  collectCoverage: true,
  collectCoverageFrom: [
    "www/js/**/*.{ts,tsx,js,jsx}",
    "!www/js/**/index.{ts,tsx,js,jsx}",
    "!www/js/types/**/*.{ts,tsx,js,jsx}",
  ],
};
