module.exports = {
  preset: 'jest-expo/web',
  testEnvironment: "jsdom",
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/platforms/",
    "/plugins/",
    "/lib/",
  ],
  modulePathIgnorePatterns: [
    "/platforms/",
    "/plugins/",
  ],
  // Extend jest-expo/web's transformIgnorePatterns to handle additional ESM packages:
  // enketo, e-mission-common, and color-*.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|enketo(-.*)?|(enketo-transformer/dist/enketo-transformer/web)|e-mission-common|color(-.*)?)",
    "/node_modules/react-native-reanimated/plugin/"
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleDirectories: ["node_modules", "src"],
  globals: { "__DEV__": false },
  setupFiles: ["<rootDir>/src/__mocks__/setupJestEnv.js"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/js/**/*.{ts,tsx,js,jsx}",
    "!src/js/**/index.{ts,tsx,js,jsx}",
    "!src/js/types/**/*.{ts,tsx,js,jsx}",
  ],
  // several functions in commHelper do not have unit tests; see note in commHelper.test.ts
  coveragePathIgnorePatterns: ['src/js/services/commHelper.ts'],
};
