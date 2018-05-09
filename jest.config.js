module.exports = {
  roots: [
    "<rootDir>",
    "<rootDir>/src",
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "/test/.*.(test|spec)\\.tsx?$",
  collectCoverage: true,
  mapCoverage: true,
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
}