module.exports = {
  verbose: true,
  testURL: "http://localhost",
  transform: {
    ".+\\.tsx?$": "ts-jest"
  },
  transformIgnorePatterns: ["/node_modules/", "/dist/"],
  testRegex: "/__tests__/.*\\.spec\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
};
