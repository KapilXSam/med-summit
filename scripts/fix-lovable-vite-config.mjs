/**
 * @lovable.dev/vite-tanstack-config ships `main` pointing at a CJS bundle that
 * require()s Vite 8 (ESM-only). Node 22.12+ rejects that with
 * ERR_REQUIRE_CYCLE_MODULE. Point `main` at the ESM entry instead.
 */
import { readFileSync, writeFileSync } from "node:fs";

const pkgPath = "node_modules/@lovable.dev/vite-tanstack-config/package.json";

try {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.main?.endsWith("index.cjs")) {
    pkg.main = "./dist/index.js";
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log("fix-lovable-vite-config: switched main to ESM entry");
  }
} catch {
  // Package not installed (e.g. partial install) — skip.
}
