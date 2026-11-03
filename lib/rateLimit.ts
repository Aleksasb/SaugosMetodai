// Very small in-memory limiter (resets when the server restarts).
const g = globalThis as unknown as { __fails?: Map<string, number[]> };
const fails = (g.__fails ??= new Map<string, number[]>());

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function recent(key: string) {
  const now = Date.now();
  const list = (fails.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  fails.set(key, list);
  return list;
}

export function isLimited(key: string) {
  return recent(key).length >= MAX_FAILS;
}

export function recordFailure(key: string) {
  recent(key).push(Date.now());
}

export function resetFailures(key: string) {
  fails.delete(key);
}
