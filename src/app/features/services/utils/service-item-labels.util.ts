/**
 * Arabic count phrase for a root item's sub-items ("types"), following the
 * Arabic number-agreement rules: 1 and 2 have their own forms, 3–10 take the
 * plural, 11+ take the singular accusative.
 */
export function formatSubItemCount(count: number): string {
  if (count <= 0) return 'بدون أنواع';
  if (count === 1) return 'نوع واحد';
  if (count === 2) return 'نوعان';
  if (count <= 10) return `${count} أنواع`;
  return `${count} نوعًا`;
}
