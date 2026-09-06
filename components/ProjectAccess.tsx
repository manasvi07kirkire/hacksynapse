"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { AppShell } from "./layout/AppShell";

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
      <AppShell
        project={project}
        projects={projects}
        selectedId={selected}
        onSelectProject={setSelected}
        error={error}
        statusMessage={
          !error && project
            ? "Analysis never merges pull requests automatically."
            : undefined
        }
      >
        {children}
      </AppShell>
    </ProjectContext.Provider>
  );
}
