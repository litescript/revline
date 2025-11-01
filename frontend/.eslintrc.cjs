/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2023: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["@typescript-eslint", "react", "react-hooks", "es5"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  settings: { react: { version: "detect" } },
  ignorePatterns: ["dist/", "node_modules/", ".vite-cache/"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "es5/no-es6-methods": "off"
  }
};
