/**
 * NorthClaw Knowledge Graph Access
 *
 * Loads the knowledge graph and provides query functions
 * that agents can use inside containers. The graph file is
 * mounted read-only into containers that need client context.
 *
 * Token-efficient: returns only matching nodes, not the full graph.
 */

import fs from "node:fs";
import path from "node:path";

interface PersonNode {
  name: string;
  role?: string;
  organization?: string;
  email?: string;
  relationship_warmth?: string;
  tags?: string[];
  last_contact?: string;
  follow_up_status?: string;
  notes?: string;
  personal_notes?: string;
}

interface OrgNode {
  name: string;
  type?: string;
  sector?: string;
  size?: string;
  tags?: string[];
  status?: string;
  notes?: string;
}

interface KnowledgeGraph {
  people: Record<string, PersonNode>;
  organizations: Record<string, OrgNode>;
  [key: string]: any;
}

const GRAPH_PATHS = [
  "data/knowledge/knowledge_graph_v2.json",
  "data/knowledge/knowledge_graph_v1.json",
];

let _graph: KnowledgeGraph | null = null;

function loadGraph(): KnowledgeGraph {
  if (_graph) return _graph;

  for (const p of GRAPH_PATHS) {
    if (fs.existsSync(p)) {
      _graph = JSON.parse(fs.readFileSync(p, "utf-8"));
      return _graph!;
    }
  }

  // Check workspace mount (inside container)
  const workspacePath = "/workspace/knowledge-graph.json";
  if (fs.existsSync(workspacePath)) {
    _graph = JSON.parse(fs.readFileSync(workspacePath, "utf-8"));
    return _graph!;
  }

  return { people: {}, organizations: {} };
}

/**
 * Find a person by name, email, or organization.
 * Returns minimal context to save tokens.
 */
export function findPerson(query: string): PersonNode[] {
  const graph = loadGraph();
  const q = query.toLowerCase();
  const results: PersonNode[] = [];

  for (const [, person] of Object.entries(graph.people || {})) {
    const match =
      person.name?.toLowerCase().includes(q) ||
      person.email?.toLowerCase().includes(q) ||
      person.organization?.toLowerCase().includes(q);

    if (match) results.push(person);
  }

  return results;
}

/**
 * Find an organization by name, type, or sector.
 */
export function findOrg(query: string): OrgNode[] {
  const graph = loadGraph();
  const q = query.toLowerCase();
  const results: OrgNode[] = [];

  for (const [, org] of Object.entries(graph.organizations || {})) {
    const match =
      org.name?.toLowerCase().includes(q) ||
      org.type?.toLowerCase().includes(q) ||
      org.sector?.toLowerCase().includes(q);

    if (match) results.push(org);
  }

  return results;
}

/**
 * Get all overdue follow-ups.
 * Token-efficient: returns only people with overdue status.
 */
export function getOverdueFollowups(): PersonNode[] {
  const graph = loadGraph();
  const results: PersonNode[] = [];

  for (const [, person] of Object.entries(graph.people || {})) {
    if (
      person.follow_up_status &&
      person.follow_up_status.toLowerCase().includes("overdue")
    ) {
      results.push(person);
    }
  }

  return results;
}

/**
 * Get all people with no contact in N days.
 */
export function getStaleContacts(days: number = 14): PersonNode[] {
  const graph = loadGraph();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const results: PersonNode[] = [];

  for (const [, person] of Object.entries(graph.people || {})) {
    if (!person.last_contact) continue;

    const lastContact = new Date(person.last_contact);
    if (lastContact < cutoff) {
      // Only include active relationships
      const activeTags = person.tags || [];
      if (
        activeTags.some((t) =>
          ["active_client", "prospect", "partnership", "warm_inbound"].includes(t)
        )
      ) {
        results.push(person);
      }
    }
  }

  return results;
}

/**
 * Get pipeline summary: prospects grouped by stage.
 * Returns compact format for token efficiency.
 */
export function getPipelineSummary(): Record<string, string[]> {
  const graph = loadGraph();
  const pipeline: Record<string, string[]> = {
    active_client: [],
    prospect: [],
    warm_inbound: [],
    partnership: [],
    other: [],
  };

  for (const [, person] of Object.entries(graph.people || {})) {
    const tags = person.tags || [];
    const label = `${person.name} (${person.organization || "unknown"})`;

    if (tags.includes("active_client")) pipeline.active_client.push(label);
    else if (tags.includes("prospect")) pipeline.prospect.push(label);
    else if (tags.includes("warm_inbound")) pipeline.warm_inbound.push(label);
    else if (tags.includes("partnership")) pipeline.partnership.push(label);
  }

  // Remove empty categories
  for (const key of Object.keys(pipeline)) {
    if (pipeline[key].length === 0) delete pipeline[key];
  }

  return pipeline;
}
