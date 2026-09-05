"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import Link from "next/link";
export interface ConnectedProject {
  id: string;
  repo: string;
  siteUrl: string;
  defaultBranch: string;
}
const ProjectContext = createContext<{
  project: ConnectedProject | null;
  refresh: () => Promise<void>;
}>({ project: null, refresh: async () => {} });
export const useProject = () => useContext(ProjectContext);
export function ProjectAccess({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ConnectedProject[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  async function refresh() {
    const res = await fetch("/api/projects", { cache: "no-store" });
    if (!res.ok) {
      setError("Sign in to access connected projects.");
      setProjects([]);
      return;
    }
    const data = await res.json();
    setProjects(data.projects);
    setError("");
    setSelected((value) =>
      data.projects.some((p: ConnectedProject) => p.id === value)
        ? value
        : data.projects[0]?.id || "",
    );
  }
  useEffect(() => {
    void refresh().catch(() => setError("Project service is unavailable."));
  }, []);
  const project = projects.find((p) => p.id === selected) || null;
  return (
    <ProjectContext.Provider value={{ project, refresh }}>
      <div className="p-3 bg-ink-900 text-bone-100 flex gap-4 items-center flex-wrap text-sm">
        <Link href="/connect">Connect / sign in</Link>
        <Link href="/watch">Live project</Link>
        <Link href="/regression">Regressions</Link>
        <Link href="/remediation">Recovery & PRs</Link>
        <Link href="/geo">GEO</Link>
        <Link href="/seo-advisor">SEO Advisor</Link>
        <select
          aria-label="Connected project"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-ink-900 border p-1"
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.repo}
            </option>
          ))}
        </select>
        <span>
          {error ||
            "Connected project data. Analysis never merges pull requests."}
        </span>
      </div>
      {children}
    </ProjectContext.Provider>
  );
}
