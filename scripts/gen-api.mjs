// scripts/gen-api.mjs
// Generates src/lib/api/schema.ts from FastAPI /openapi.json.
// Usage: node scripts/gen-api.mjs [--url http://localhost:8000/openapi.json]
import { execSync } from "node:child_process";

const argUrl =
  process.argv.includes("--url")
    ? process.argv[process.argv.indexOf("--url") + 1]
    : null;

// Prefer explicit flag, then env, then sensible default
const OPENAPI_URL =
  argUrl ||
  process.env.OPENAPI_URL ||
  "http://localhost:8000/openapi.json";

const OUT = "src/lib/api/schema.ts";

console.log(`→ Generating types from: ${OPENAPI_URL}`);
execSync(`npx openapi-typescript "${OPENAPI_URL}" -o "${OUT}"`, {
  stdio: "inherit",
});
console.log(`✓ Wrote ${OUT}`);
