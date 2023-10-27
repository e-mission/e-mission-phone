module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    "/node_modules/",
    "/platforms/",
    "/plugins/",
    "/lib/",
    "/manual_lib/"
  ],
  preset: 'react-native',
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native(-.*)?|@react-native(-community)?)/)"
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleDirectories: ["node_modules", "src"],
};