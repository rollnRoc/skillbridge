/**
 * Claude bazen JSON'u markdown code fence içinde veya ek metinle döndürür.
 * Bu yardımcılar daha dayanıklı parse sağlar.
 */
export function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let t = fence ? fence[1].trim() : trimmed;
  t = t.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
  const brace = t.match(/\{[\s\S]*\}/);
  return brace ? brace[0] : t;
}

export function parseJsonLoose<T = unknown>(rawText: string): T {
  const attempts: (() => T)[] = [
    () => JSON.parse(extractJsonObject(rawText)) as T,
    () => {
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('no braces');
      return JSON.parse(rawText.slice(start, end + 1)) as T;
    },
  ];
  let last: unknown;
  for (const fn of attempts) {
    try {
      return fn();
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
