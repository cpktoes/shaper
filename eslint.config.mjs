import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototype handoff bundle from Claude Design — read for reference, never edited.
    "reference/**",
    // Claude Code's per-session and per-agent git worktrees live under .claude/worktrees/ (kept
    // out of git via .git/info/exclude). ESLint walks the filesystem, not git, so without this
    // a leftover worktree's own copy of the app gets linted twice and can fail `npm run lint`.
    ".claude/**",
  ]),
]);

export default eslintConfig;
