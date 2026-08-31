#!/usr/bin/env node
/**
 * CARATOM full-repo security suite.
 * Never prints secret match values. ZAP runs only against local 127.0.0.1:8000.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BIN = join(ROOT, "scripts", "security", "bin");
const REPORT = join(ROOT, "security", "last-run.md");
const LOCAL_API = "http://127.0.0.1:8000";
const IS_WIN = process.platform === "win32";

mkdirSync(BIN, { recursive: true });

const log = [];
function note(line) {
  log.push(line);
  console.log(line);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: IS_WIN && !cmd.includes("\\") && !cmd.includes("/"),
    maxBuffer: 20 * 1024 * 1024,
    ...opts,
  });
  return result;
}

function which(bin) {
  const probe = spawnSync(IS_WIN ? "where.exe" : "which", [bin], {
    encoding: "utf8",
  });
  if (probe.status === 0 && probe.stdout.trim()) {
    return probe.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
}

function dockerBin() {
  return which("docker");
}

function dockerAvailable() {
  const docker = dockerBin();
  if (!docker) return false;
  const info = run(docker, ["info"]);
  return info.status === 0;
}

function dockerRun(image, args) {
  if (!dockerAvailable()) return null;
  const docker = dockerBin();
  return run(docker, ["run", "--rm", "-v", `${ROOT}:/src`, "-w", "/src", image, ...args]);
}

async function healthUp() {
  try {
    const res = await fetch(`${LOCAL_API}/health`, { signal: AbortSignal.timeout(2000) }); // nosemgrep
    return res.ok;
  } catch {
    return false;
  }
}

function redact(text) {
  if (!text) return "";
  return text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/(sk_live|sk_test|service_role|eyJ)[A-Za-z0-9._\-]+/gi, "[redacted]");
}

let failed = false;

function failStep(name, detail) {
  failed = true;
  note(`FAIL ${name}: ${detail}`);
}

function okStep(name, detail = "") {
  note(`OK   ${name}${detail ? ` — ${detail}` : ""}`);
}

function skipStep(name, reason) {
  note(`SKIP ${name} — ${reason}`);
}

const SEMGREP_ARGS = [
  "--metrics=off",
  "--error",
  "--config",
  ".semgrep.yml",
  "--config",
  "p/owasp-top-ten",
  "--config",
  "p/python",
  "--config",
  "p/javascript",
  "--config",
  "p/react",
  "--config",
  "p/jwt",
  "--config",
  "p/secrets",
  "--exclude",
  "node_modules",
  "--exclude",
  "backend/.venv",
  "--exclude",
  "scripts/security/bin",
  "--exclude",
  ".agents/skills",
  "--exclude",
  ".cursor/skills",
];

function runSemgrep() {
  const uvSemgrep = join(ROOT, "backend", ".venv", IS_WIN ? "Scripts/semgrep.exe" : "bin/semgrep");
  const uvx = which("uvx");
  const candidates = [which("semgrep"), existsSync(uvSemgrep) ? uvSemgrep : null].filter(Boolean);

  for (const bin of candidates) {
    const result = run(bin, SEMGREP_ARGS);
    if (result.status === 0) {
      okStep("semgrep");
      return;
    }
    if (result.status === 127 || result.error) {
      continue;
    }
    failStep("semgrep", `exit ${result.status}`);
    if (result.stderr) console.error(redact(result.stderr).slice(0, 4000));
    if (result.stdout) console.error(redact(result.stdout).slice(0, 4000));
    return;
  }
  if (uvx) {
    const result = run(uvx, ["semgrep", ...SEMGREP_ARGS]);
    if (result.status === 0) {
      okStep("semgrep", "via uvx");
      return;
    }
    if (result.status !== 127 && !result.error) {
      failStep("semgrep", `exit ${result.status}`);
      if (result.stderr) console.error(redact(result.stderr).slice(0, 4000));
      if (result.stdout) console.error(redact(result.stdout).slice(0, 4000));
      return;
    }
  }
  const docker = dockerRun("returntocorp/semgrep:latest", SEMGREP_ARGS);
  if (docker && docker.status === 0) {
    okStep("semgrep", "via docker");
    return;
  }
  if (docker && docker.status !== 127 && !docker.error) {
    failStep("semgrep", `exit ${docker.status}`);
    if (docker.stderr) console.error(redact(docker.stderr).slice(0, 4000));
    if (docker.stdout) console.error(redact(docker.stdout).slice(0, 4000));
    return;
  }
  failStep(
    "semgrep",
    "semgrep not installed. CI installs it; locally: pipx install semgrep, uvx semgrep, or Docker.",
  );
}

function gitleaksArgs(source) {
  const args = [
    "detect",
    "--source",
    source,
    "--config",
    source === "/src" ? "/src/gitleaks.toml" : "gitleaks.toml",
    "--redact",
    "--no-banner",
    "--exit-code",
    "1",
  ];
  if (!existsSync(join(ROOT, ".git"))) {
    args.push("--no-git");
  }
  return args;
}

function runGitleaks() {
  const local = join(BIN, IS_WIN ? "gitleaks.exe" : "gitleaks");
  const bin = which("gitleaks") || (existsSync(local) ? local : null);
  if (bin) {
    const result = run(bin, gitleaksArgs("."));
    if (result.status === 0) {
      okStep("gitleaks", existsSync(join(ROOT, ".git")) ? "" : "working tree (--no-git, no .git)");
      return;
    }
    failStep("gitleaks", `exit ${result.status} (matches redacted)`);
    if (result.stderr) console.error(redact(result.stderr).slice(0, 2000));
    return;
  }
  const docker = dockerRun("ghcr.io/gitleaks/gitleaks:v8.24.3", gitleaksArgs("/src"));
  if (docker && docker.status === 0) {
    okStep("gitleaks", "via docker");
    return;
  }
  if (docker && docker.status !== 127 && !docker.error) {
    failStep("gitleaks", `exit ${docker.status} (matches redacted)`);
    return;
  }
  failStep("gitleaks", "gitleaks CLI not on PATH. CI installs it; locally install gitleaks or Docker.");
}

function runOsv() {
  const local = join(BIN, IS_WIN ? "osv-scanner.exe" : "osv-scanner");
  const bin = which("osv-scanner") || (existsSync(local) ? local : null);
  if (bin) {
    const result = run(bin, [
      "scan",
      "--lockfile",
      "pnpm-lock.yaml",
      "--lockfile",
      "backend/uv.lock",
      "--config",
      "security/osv-config.toml",
    ]);
    if (result.status === 0) {
      okStep("osv-scanner");
      return;
    }
    failStep("osv-scanner", `exit ${result.status}`);
    if (result.stdout) console.log(result.stdout.slice(0, 6000));
    if (result.stderr) console.error(result.stderr.slice(0, 2000));
    return;
  }
  const docker = dockerRun("ghcr.io/google/osv-scanner:v2", [
    "scan",
    "--lockfile",
    "/src/pnpm-lock.yaml",
    "--lockfile",
    "/src/backend/uv.lock",
    "--config",
    "/src/security/osv-config.toml",
  ]);
  if (docker && docker.status === 0) {
    okStep("osv-scanner", "via docker");
    return;
  }
  if (docker && docker.status !== 127 && !docker.error) {
    failStep("osv-scanner", `exit ${docker.status}`);
    if (docker.stdout) console.log(docker.stdout.slice(0, 6000));
    if (docker.stderr) console.error(docker.stderr.slice(0, 2000));
    return;
  }
  failStep("osv-scanner", "osv-scanner not on PATH. CI installs it; locally install osv-scanner or Docker.");
}

async function runZap(apiUp) {
  if (!apiUp) {
    skipStep("zap", `GET ${LOCAL_API}/health is down — DAST skipped (not a pass)`);
    return;
  }
  if (!dockerAvailable()) {
    skipStep("zap", "docker daemon not available — DAST skipped (not a pass)");
    return;
  }
  const docker = dockerBin();
  const target = IS_WIN ? "http://host.docker.internal:8000" : LOCAL_API;
  const args = ["run", "--rm"];
  if (!IS_WIN) {
    args.push("--network", "host");
  }
  const home = homedir();
  args.push(
    "-v",
    `${home}:/zap/wrk:rw`,
    "ghcr.io/zaproxy/zaproxy:stable",
    "zap-baseline.py",
    "-t",
    target,
    "-I",
  );
  const result = run(docker, args);
  if (result.status === 0 || result.status === 2) {
    okStep("zap", `baseline exit ${result.status}`);
    return;
  }
  if (result.status === 125) {
    skipStep("zap", "docker run failed to start — DAST skipped (not a pass)");
    return;
  }
  failStep("zap", `exit ${result.status}`);
}

const apiUp = await healthUp();
note(`API health ${LOCAL_API}: ${apiUp ? "up" : "down"}`);
runSemgrep();
runGitleaks();
runOsv();
await runZap(apiUp);

const summary = [
  `# Security suite last run`,
  ``,
  `- When: ${new Date().toISOString()}`,
  `- API health: ${apiUp ? "up" : "down (ZAP skipped)"}`,
  `- Result: ${failed ? "FAILED" : "passed"}`,
  ``,
  ...log.map((line) => `- ${line}`),
  ``,
].join("\n");
writeFileSync(REPORT, summary, "utf8");

if (failed) {
  console.error("Security suite failed. See security/last-run.md (no secret values).");
  process.exit(1);
}
note("Security suite passed.");
