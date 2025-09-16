import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"]},
  {files: ["**/*.js"], languageOptions: {sourceType: "script"}},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,

  {
    ...pluginReact.configs.flat.recommended,
    // Add settings to specify the new JSX transform
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
        pragma: "React",   // Old pragma, but good to have for compatibility
        jsxRuntime: "automatic" // This is the key for modern React
      }
    },
    // Add the rule to disable the outdated check
    rules: {
      ...pluginReact.configs.flat.recommended.rules, // Keep existing recommended rules
      "react/react-in-jsx-scope": "off"
    }
  }

];