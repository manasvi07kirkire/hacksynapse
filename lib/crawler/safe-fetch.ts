import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { AppError, fail } from "../server/errors";

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}
export function normalizeUrl(value: string, base?: string): string {
  if (/[\\\x00-\x20]/.test(value) || /%(?:00|2e|2f|5c|25)/i.test(value))
    fail(400, "INVALID_URL", "Invalid target URL.");
  let u: URL;
  try {
    u = new URL(value, base);
  } catch {
    fail(400, "INVALID_URL", "Invalid target URL.");
  }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
    fail(
      400,
      "INVALID_URL",
      "Only HTTP(S) URLs without credentials are accepted.",
    );
  u.hash = "";
  u.search = "";
  u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  return u.href;
}
export interface FetchResult {
  url: string;
  status: number;
  text: string;
  headers: http.IncomingHttpHeaders;
}
export interface FetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  origin?: string;
  signal?: AbortSignal;
  contentTypes?: string[];
}
export function pickPinnedAddress(
  addresses: { address: string; family: number }[],
) {
  return addresses.find((a) => a.family === 4) ?? addresses[0];
}
export async function safeFetch(
  value: string,
  options: FetchOptions = {},
): Promise<FetchResult> {
  let url = new URL(normalizeUrl(value));
  const origin = options.origin || url.origin;
  const signal = AbortSignal.any([
    AbortSignal.timeout(options.timeoutMs || 10000),
    ...(options.signal ? [options.signal] : []),
  ]);
  const privateAllowed =
    process.env.NODE_ENV !== "production" &&
    process.env.SEARCHOPS_LOCAL_DEMO === "true" &&
    process.env.SEARCHOPS_ALLOW_PRIVATE_CRAWL === "true";
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (url.origin !== origin)
      fail(400, "CROSS_ORIGIN", "Cross-origin crawl is not allowed.");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        if (signal.aborted)
          reject(
            new AppError(
              504,
              "FETCH_TIMEOUT",
              "Target request timed out.",
              true,
            ),
          );
        else
          signal.addEventListener(
            "abort",
            () =>
              reject(
                new AppError(
                  504,
                  "FETCH_TIMEOUT",
                  "Target request timed out.",
                  true,
                ),
              ),
            { once: true },
          );
      }),
    ]);
    if (
      !addresses.length ||
      (!privateAllowed && addresses.some((a) => !isPublicAddress(a.address)))
    )
      fail(400, "SSRF_BLOCKED", "Target address is not public.");
    const pinned = pickPinnedAddress(addresses);
    const response = await new Promise<FetchResult>((resolve, reject) => {
      const request = (url.protocol === "https:" ? https : http).request(
        url,
        {
          method: "GET",
          agent: false,
          signal,
          headers: {
            "User-Agent": "SearchOps/1.0 (authorized discoverability monitor)",
            Accept: "text/html,application/xml,text/plain",
            "Accept-Encoding": "identity",
          },
          lookup: (_host, lookupOptions, callback) => {
            if (lookupOptions?.all) {
              callback(null, [
                { address: pinned.address, family: pinned.family },
              ]);
              return;
            }
            callback(null, pinned.address, pinned.family);
          },
        },
        (res) => {
          const status = res.statusCode || 0;
          if ([301, 302, 303, 307, 308].includes(status)) {
            res.resume();
            resolve({ url: url.href, status, text: "", headers: res.headers });
            return;
          }
          if (
            res.headers["content-encoding"] &&
            res.headers["content-encoding"] !== "identity"
          ) {
            res.destroy();
            reject(
              new AppError(
                422,
                "UNSUPPORTED_ENCODING",
                "Target used unsupported compression.",
              ),
            );
            return;
          }
          const max = options.maxBytes || 1024 * 1024;
          if (Number(res.headers["content-length"]) > max) {
            res.destroy();
            reject(
              new AppError(
                422,
                "RESPONSE_TOO_LARGE",
                "Target response is too large.",
              ),
            );
            return;
          }
          const contentType = (res.headers["content-type"] || "").toLowerCase();
          if (
            status >= 200 &&
            status < 300 &&
            options.contentTypes &&
            !options.contentTypes.some(
              (t) => contentType.split(";")[0].trim() === t,
            )
          ) {
            res.destroy();
            reject(
              new AppError(
                422,
                "CONTENT_TYPE",
                "Target content type is unsupported.",
              ),
            );
            return;
          }
          if (
            /charset=/i.test(contentType) &&
            !/charset=["']?(utf-8|utf8|us-ascii)/i.test(contentType)
          ) {
            res.destroy();
            reject(
              new AppError(
                422,
                "UNSUPPORTED_CHARSET",
                "Target charset is unsupported.",
              ),
            );
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > max) {
              res.destroy(
                new AppError(
                  422,
                  "RESPONSE_TOO_LARGE",
                  "Target response is too large.",
                ),
              );
            } else chunks.push(chunk);
          });
          res.on("error", reject);
          res.on("end", () =>
            resolve({
              url: url.href,
              status,
              text: Buffer.concat(chunks).toString("utf8"),
              headers: res.headers,
            }),
          );
        },
      );
      request.setTimeout(5000, () =>
        request.destroy(
          new AppError(504, "FETCH_TIMEOUT", "Target request timed out.", true),
        ),
      );
      request.on("error", (e) =>
        reject(
          e instanceof AppError
            ? e
            : new AppError(502, "FETCH_FAILED", "Target request failed.", true),
        ),
      );
      request.end();
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (!response.headers.location)
      fail(422, "INVALID_REDIRECT", "Target returned an invalid redirect.");
    url = new URL(normalizeUrl(response.headers.location, url.href));
  }
  fail(422, "REDIRECT_LIMIT", "Target exceeded the redirect limit.");
}
