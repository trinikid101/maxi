// Build a fully static export for GitHub Pages.
//
// Next.js static export cannot include the (server) /api route handler, so we
// temporarily move it aside, run the export, then always move it back — even if
// the build fails — so the source tree is never left in a broken state.
import { execSync } from "node:child_process";
import { existsSync, renameSync, writeFileSync } from "node:fs";

const API_DIR = "src/app/api";
const API_BAK = ".api-export-bak";

const moved = existsSync(API_DIR);
if (moved) renameSync(API_DIR, API_BAK);

try {
  execSync("next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      STATIC_EXPORT: "true",
      NEXT_PUBLIC_STATIC: "true",
    },
  });
  // GitHub Pages serves the artifact as-is (no Jekyll), but .nojekyll is a
  // harmless safeguard so the _next/ directory is never filtered.
  writeFileSync("out/.nojekyll", "");
  console.log("\nStatic export complete → ./out");
} finally {
  if (moved && existsSync(API_BAK)) renameSync(API_BAK, API_DIR);
}
