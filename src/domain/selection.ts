export function toggleSelection(
  selectedIds: ReadonlySet<string>,
  id: string,
  additive: boolean
): Set<string> {
  if (!additive) return new Set([id]);

  const next = new Set(selectedIds);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function selectRange<T extends { id: string }>(
  items: T[],
  anchorId: string | null,
  targetId: string
): Set<string> {
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) return new Set();

  const anchorIndex = anchorId ? items.findIndex((item) => item.id === anchorId) : -1;
  const start = anchorIndex < 0 ? targetIndex : Math.min(anchorIndex, targetIndex);
  const end = anchorIndex < 0 ? targetIndex : Math.max(anchorIndex, targetIndex);
  return new Set(items.slice(start, end + 1).map((item) => item.id));
}

export function selectAll<T extends { id: string }>(items: T[]): Set<string> {
  return new Set(items.map((item) => item.id));
}
