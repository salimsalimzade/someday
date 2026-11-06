/** Capitalises the first letter of every word: "ada lovelace" → "Ada Lovelace". */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}
