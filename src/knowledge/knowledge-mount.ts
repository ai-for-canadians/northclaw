/**
 * NorthClaw Knowledge Mount
 *
 * Mounts the knowledge graph as read-only into containers
 * that need client context. Only mounts if the file exists.
 */

import fs from "node:fs";
import path from "node:path";

const GRAPH_PATHS = [
  "data/knowledge/knowledge_graph_v2.json",
  "data/knowledge/knowledge_graph_v1.json",
];

/**
 * Get Docker mount args for knowledge graph.
 * Returns empty array if no graph file exists.
 */
export function knowledgeMountArgs(): string[] {
  for (const p of GRAPH_PATHS) {
    const abs = path.resolve(p);
    if (fs.existsSync(abs)) {
      return ["-v", `${abs}:/workspace/knowledge-graph.json:ro`];
    }
  }
  return [];
}

/**
 * Ensure the knowledge directory exists.
 */
export function ensureKnowledgeDir(): void {
  const dir = "data/knowledge";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
