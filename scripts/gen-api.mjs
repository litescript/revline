// scripts/gen-api.mjs
import { execSync } from "node:child_process";

const argUrl =
  process.argv.includes("--url")
    ? process.argv[process.argv.indexOf("--url") + 1]
    : null;

const OPENAPI_URL =
  argUrl || process.env.OPENAPI_URL || "http://localhost:8000/openapi.json";

// Allow override via env; default to frontend path
const OUT = process.env.OPENAPI_OUT || "frontend/src/lib/api/schema.ts";

console.log(`→ Generating types from: ${OPENAPI_URL}`);
execSync(`npx openapi-typescript "${OPENAPI_URL}" -o "${OUT}"`, {
  stdio: "inherit",
});
console.log(`✓ Wrote ${OUT}`);
