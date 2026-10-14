module.exports = {
  testEnvironment: "node",
  transform: {
    ".+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/__tests__/tsconfig.json" }],
  },
  transformIgnorePatterns: ["/node_modules/", "/dist/"],
  testRegex: "/__tests__/.*\\.spec\\.tsx?$",
};
