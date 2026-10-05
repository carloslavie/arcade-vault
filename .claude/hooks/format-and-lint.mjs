// PostToolUse hook: runs Prettier and ESLint on every file Claude writes or edits.
// Exit code 2 sends remaining lint errors back to Claude so it can fix them.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const LINTABLE = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

const projectDir = path.resolve(
  process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
);

let input = "";
for await (const chunk of process.stdin) input += chunk;

const filePath = JSON.parse(input || "{}").tool_input?.file_path;
if (!filePath) process.exit(0);

const absPath = path.resolve(projectDir, filePath);
const relPath = path.relative(projectDir, absPath);
if (
  relPath.startsWith("..") ||
  path.isAbsolute(relPath) ||
  !existsSync(absPath)
) {
  process.exit(0);
}

function run(cmd, args) {
  return spawnSync([cmd, ...args, `"${relPath}"`].join(" "), {
    cwd: projectDir,
    shell: true,
    encoding: "utf8",
  });
}

const problems = [];

const prettier = run("npx", [
  "prettier",
  "--write",
  "--ignore-unknown",
  "--log-level",
  "warn",
]);
if (prettier.status !== 0) {
  problems.push(
    `Prettier failed on ${relPath}:\n${prettier.stderr || prettier.stdout}`,
  );
}

if (LINTABLE.has(path.extname(absPath).toLowerCase())) {
  const eslint = run("npx", ["eslint", "--fix", "--no-warn-ignored"]);
  if (eslint.status !== 0) {
    problems.push(
      `ESLint errors in ${relPath}:\n${eslint.stdout || eslint.stderr}`,
    );
  }
}

if (problems.length > 0) {
  process.stderr.write(problems.join("\n\n"));
  process.exit(2);
}
