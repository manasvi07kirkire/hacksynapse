import { parsePatch, applyPatch, createTwoFilesPatch } from "diff";
import { parse } from "@babel/parser";
import { fail } from "../server/errors";
export function assertSafePath(path: string) {
  if (
    path.length > 300 ||
    !/^[a-zA-Z0-9_./\[\]-]+$/.test(path) ||
    path.startsWith("/") ||
    path
      .split("/")
      .some((p) => !p || p === "." || p === ".." || p.startsWith(".")) ||
    /(^|\/)(node_modules|vendor|dist|build|coverage|generated|package(?:-lock)?\.json|yarn\.lock|pnpm-lock\.yaml)(\/|$)/i.test(
      path,
    ) ||
    !/\.(html?|tsx?|jsx?|json|txt|md|xml)$/.test(path)
  )
    fail(422, "UNSAFE_PATH", "Patch path is not allowed.");
}
export function validateSource(path: string, content: string) {
  assertSafePath(path);
  if (Buffer.byteLength(content) > 262144 || content.includes("\0"))
    fail(422, "UNSUPPORTED_FILE", "File exceeds validation limits.");
  try {
    if (/\.[jt]sx?$/.test(path))
      parse(content, {
        sourceType: "unambiguous",
        plugins: ["typescript", "jsx"],
      });
    if (path.endsWith(".json")) JSON.parse(content);
  } catch {
    fail(422, "SYNTAX_INVALID", "Patched source is invalid.");
  }
}
export function strictApply(path: string, source: string, diff: string) {
  assertSafePath(path);
  if (diff.length > 262144) fail(422, "PATCH_LIMIT", "Patch exceeds budget.");
  const patches = parsePatch(diff);
  if (
    patches.length !== 1 ||
    patches[0].oldFileName !== `a/${path}` ||
    patches[0].newFileName !== `b/${path}` ||
    !patches[0].hunks.length
  )
    fail(
      422,
      "INVALID_PATCH",
      "Patch must modify exactly one authorized file.",
    );
  const result = applyPatch(source, patches[0], {
    fuzzFactor: 0,
    autoConvertLineEndings: false,
  });
  if (result === false || result === source)
    fail(
      409,
      "PATCH_CONTEXT_MISMATCH",
      "Patch does not match the exact source.",
    );
  validateSource(path, result);
  return result;
}
export function sourceDiff(path: string, before: string, after: string) {
  assertSafePath(path);
  return createTwoFilesPatch(`a/${path}`, `b/${path}`, before, after);
}
