"use client";
import { useState } from "react";
import { useProject } from "../../components/ProjectAccess";
export default function Connect() {
  const { refresh } = useProject();
  const [key, setKey] = useState("");
  const [repo, setRepo] = useState("");
  const [siteUrl, setUrl] = useState("");
  const [installId, setInstall] = useState("");
  const [routes, setRoutes] = useState("/");
  const [sourceMap, setMap] = useState('{"/":"index.html"}');
  const [message, setMessage] = useState("");
  async function submit(kind: "login" | "connect") {
    try {
      const res = await fetch(
        kind === "login" ? "/api/session" : "/api/projects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(kind === "login" ? { "x-searchops-key": key } : {}),
          },
          body:
            kind === "login"
              ? "{}"
              : JSON.stringify({
                  repo,
                  siteUrl,
                  installId: installId || undefined,
                  routeManifest: routes.split(",").map((s) => s.trim()),
                  sourceMap: JSON.parse(sourceMap),
                }),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.requestId
            ? `${data.error} (request ${data.requestId})`
            : data.error || "Request failed.",
        );
      setKey("");
      setMessage(kind === "login" ? "Signed in." : "Project connected.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Connection failed.");
    }
  }
  return (
    <main className="max-w-2xl mx-auto p-8 space-y-5">
      <h1 className="text-3xl">Connect SearchOps</h1>
      <p>Sign in with your operator key. The session lasts eight hours.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit("login");
        }}
        className="flex gap-2"
      >
        <input
          aria-label="Operator key"
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="border p-2 flex-1"
        />
        <button className="border p-2">Sign in</button>
      </form>
      <h2 className="text-xl">Connect a repository</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit("connect");
        }}
        className="grid gap-3"
      >
        {[
          ["Repository (owner/name)", repo, setRepo],
          ["Deployed site URL", siteUrl, setUrl],
          ["GitHub installation ID", installId, setInstall],
          ["Routes, separated by commas", routes, setRoutes],
          ["Page to source mapping (JSON)", sourceMap, setMap],
        ].map(([label, value, setter]) => (
          <label key={String(label)}>
            {String(label)}
            <input
              value={String(value)}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              className="border p-2 w-full"
            />
          </label>
        ))}
        <button className="bg-ink-900 text-bone-100 p-3">
          Verify and connect
        </button>
      </form>
      <p role="status">{message}</p>
    </main>
  );
}
