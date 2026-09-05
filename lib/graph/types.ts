import { ExtractedPageData } from "../extract/types";

export type NodeKind = "page" | "template" | "schema" | "signal";
export type NodeHealth = "PASS" | "DEGRADED" | "REGRESSION";
export type EdgeKind =
  "links_to" | "canonical_to" | "renders_from" | "has_schema";

export interface GraphNodeData {
  id: string;
  type: NodeKind;
  url: string;
  key: string;
  title?: string;
  health: NodeHealth;
  attrs: {
    statusCode?: number;
    hasCanonical?: boolean;
    canonicalTarget?: string;
    isNoindexed?: boolean;
    schemaTypes?: string[];
    internalOutlinks?: number;
    internalInlinks?: number;
    templateName?: string;
    [key: string]: any;
  };
}

export interface GraphEdgeData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: EdgeKind;
}

export interface GraphSnapshotData {
  id: string;
  deploymentId: string;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  createdAt: string;
  version?: string;
  complete?: boolean;
  sitemapUrls?: string[];
  llmsTxtValid?: boolean;
  crawlErrors?: { url: string; code: string }[];
}

export interface NodeDiff {
  nodeId: string;
  url: string;
  changeType: "ADDED" | "REMOVED" | "CHANGED" | "UNCHANGED";
  healthBefore?: NodeHealth;
  healthAfter: NodeHealth;
  propertyDeltas: {
    property: string;
    before: any;
    after: any;
  }[];
}

export interface EdgeDiff {
  fromNodeId: string;
  toNodeId: string;
  kind: EdgeKind;
  changeType: "ADDED" | "REMOVED";
}

export interface GraphDiffResult {
  previousDeploymentId: string;
  currentDeploymentId: string;
  addedNodes: GraphNodeData[];
  removedNodes: GraphNodeData[];
  changedNodes: NodeDiff[];
  addedEdges: GraphEdgeData[];
  removedEdges: GraphEdgeData[];
  regressedNodeIds: string[];
  totalAffectedPages: number;
}
