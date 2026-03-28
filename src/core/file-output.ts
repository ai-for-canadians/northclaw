/**
 * NorthClaw File Output Handler
 *
 * When an agent generates a file inside a container (PDF, docx, CSV, etc.),
 * this module copies it to the group's persistent workspace before the
 * container is destroyed, then shares it via the active channel.
 *
 * Files are written to: data/groups/{groupId}/outputs/
 * This directory is on the bind-mounted workspace, so it survives container death.
 */

import fs from "node:fs";
import path from "node:path";

const OUTPUTS_DIR = "outputs";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

interface OutputFile {
  filename: string;
  filepath: string;
  size: number;
  createdAt: string;
  groupId: string;
}

/**
 * Ensure the outputs directory exists for a group.
 */
function ensureOutputDir(groupId: string): string {
  const dir = path.join("data", "groups", groupId, OUTPUTS_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save a file from the container's /tmp to the group's persistent outputs.
 * Call this before the container is destroyed.
 */
export function saveOutput(
  groupId: string,
  sourcePath: string,
  filename?: string,
): OutputFile | null {
  if (!fs.existsSync(sourcePath)) {
    console.warn(`[file-output] Source not found: ${sourcePath}`);
    return null;
  }

  const stats = fs.statSync(sourcePath);
  if (stats.size > MAX_FILE_SIZE) {
    console.warn(
      `[file-output] File too large: ${stats.size} bytes (max ${MAX_FILE_SIZE})`,
    );
    return null;
  }

  const outputDir = ensureOutputDir(groupId);
  const name = filename || path.basename(sourcePath);

  // Add timestamp to prevent overwrites
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const finalName = `${base}_${timestamp}${ext}`;
  const destPath = path.join(outputDir, finalName);

  fs.copyFileSync(sourcePath, destPath);

  const output: OutputFile = {
    filename: finalName,
    filepath: destPath,
    size: stats.size,
    createdAt: new Date().toISOString(),
    groupId,
  };

  console.log(`[file-output] Saved: ${destPath} (${stats.size} bytes)`);
  return output;
}

/**
 * List all output files for a group.
 */
export function listOutputs(groupId: string): OutputFile[] {
  const dir = path.join("data", "groups", groupId, OUTPUTS_DIR);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith("."))
    .map((f) => {
      const filepath = path.join(dir, f);
      const stats = fs.statSync(filepath);
      return {
        filename: f,
        filepath,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        groupId,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Clean up old output files. Keep the most recent N files per group.
 */
export function pruneOutputs(groupId: string, keep: number = 20): number {
  const outputs = listOutputs(groupId);
  let removed = 0;

  if (outputs.length <= keep) return 0;

  const toRemove = outputs.slice(keep);
  for (const file of toRemove) {
    fs.unlinkSync(file.filepath);
    removed++;
  }

  console.log(`[file-output] Pruned ${removed} old files from ${groupId}`);
  return removed;
}
