// Conventional Commits, com os tipos extras do projeto (ui, config).
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "perf", "ui", "config", "refactor", "style", "docs", "build", "ci", "chore", "revert", "test"],
    ],
    "subject-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", 72],
    "scope-case": [2, "always", "kebab-case"],
  },
};
