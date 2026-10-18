import { subjectsApi } from "@/lib/api-client";
import type { Topic } from "@/types/content";

/**
 * Flattens every topic across every (active) real backend subject. Used to
 * tell a real, backend-seeded topic apart from a demo-only one — only real
 * topics can be sent to POST /api/v1/lessons (the backend requires an
 * existing topic_id).
 */
export async function listAllRealTopics(): Promise<Topic[]> {
  const subjectsResult = await subjectsApi.list();
  if (!subjectsResult.ok) return [];

  const detailResults = await Promise.all(subjectsResult.data.map((s) => subjectsApi.getWithTopics(s.id)));
  return detailResults.filter((r) => r.ok).flatMap((r) => (r.ok ? r.data.topics : []));
}

export function findBestMatchingRealTopic(topics: Topic[], text: string): Topic | null {
  const lowered = text.toLowerCase();
  return topics.find((t) => lowered.includes(t.name.toLowerCase())) ?? null;
}
