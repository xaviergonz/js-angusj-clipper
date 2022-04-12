module.exports = {
  testEnvironment: 'node',
  transform: {
    ".+\\.tsx?$": "ts-jest"
  },
  transformIgnorePatterns: ["/node_modules/", "/dist/"],
  testRegex: "/__tests__/.*\\.spec\\.tsx?$",
};
