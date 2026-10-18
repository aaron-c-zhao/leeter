import { desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { memory, memoryVersions } from "../db/schema.js";

export const MAX_MEMORY_BYTES = 64 * 1024;

export interface MemoryVersion {
  id: number;
  size: number;
  createdAt: number;
  body: string;
}

export async function putMemory(db: Db, body: string): Promise<{ versionId: number; size: number }> {
  const size = Buffer.byteLength(body, "utf8");
  if (size > MAX_MEMORY_BYTES) {
    throw new Error(`memory body exceeds ${MAX_MEMORY_BYTES} bytes (got ${size})`);
  }
  const now = Date.now();
  return db.transaction((tx) => {
    const version = tx
      .insert(memoryVersions)
      .values({ body, size, createdAt: now })
      .returning({ id: memoryVersions.id })
      .get();
    const existing = tx.select().from(memory).limit(1).get();
    if (existing) {
      tx.update(memory).set({ currentVersionId: version.id, updatedAt: now }).where(eq(memory.id, existing.id)).run();
    } else {
      tx.insert(memory).values({ currentVersionId: version.id, updatedAt: now }).run();
    }
    return { versionId: version.id, size };
  });
}

/** Current memory body, or null when no agent memory has been stored yet. */
export async function getMemory(db: Db): Promise<{ body: string; versionId: number; updatedAt: number } | null> {
  const [current] = await db.select().from(memory).limit(1);
  if (!current) return null;
  const [version] = await db
    .select()
    .from(memoryVersions)
    .where(eq(memoryVersions.id, current.currentVersionId))
    .limit(1);
  if (!version) return null;
  return { body: version.body, versionId: version.id, updatedAt: current.updatedAt };
}

/** Full version history, newest first — the human-inspectable audit trail. */
export async function listMemoryVersions(db: Db): Promise<MemoryVersion[]> {
  const rows = await db.select().from(memoryVersions).orderBy(desc(memoryVersions.id));
  return rows.map((r) => ({ id: r.id, size: r.size, createdAt: r.createdAt, body: r.body }));
}
