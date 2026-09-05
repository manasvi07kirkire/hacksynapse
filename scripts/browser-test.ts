import { spawn } from "node:child_process";
if (process.platform === "win32") process.env.PATH = `${process.env.SystemRoot || "C:\\Windows"}\\System32;${process.env.PATH || ""}`;
const child = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], { stdio: "inherit", windowsHide: true, env: process.env });
child.once("error", () => { console.error("Browser test runner could not start."); process.exitCode = 1; });
child.once("exit", (code) => { process.exitCode = code ?? 1; });
