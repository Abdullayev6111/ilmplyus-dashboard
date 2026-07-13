/** Har bir maydon qiymati matn: bo'sh string = filtr qo'yilmagan. */
export type FilterBarValues<K extends string = string> = Record<K, string>;

export function countFilterBarValues(values: Record<string, string>): number {
  return Object.values(values).filter(Boolean).length;
}
