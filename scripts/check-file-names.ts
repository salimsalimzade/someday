// Fails when a staged path has a file or folder name that isn't lowercase kebab-case.
// Usage: node scripts/check-file-names.ts <path...>

const allowedNames = new Set(["README.md", "LICENSE", "CLAUDE.md", "Dockerfile"]);

// Each dot-separated part is kebab-case: "vite.config.ts", ".env.example", "api-client.ts".
const kebabCase = /^\.?[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/;

const invalidPaths = process.argv
  .slice(2)
  .filter((path) =>
    path.split("/").some((segment) => !allowedNames.has(segment) && !kebabCase.test(segment)),
  );

if (invalidPaths.length > 0) {
  console.error("These paths are not lowercase kebab-case:");
  for (const path of invalidPaths) {
    console.error(`  ${path}`);
  }
  process.exit(1);
}
