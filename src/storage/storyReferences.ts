import type { Character } from '../types';

export function filterReferenceCandidates(characters: Character[], query: string): Character[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return characters;

  return characters.filter((character) =>
    [
      character.name,
      character.sourceTitle,
      ...(character.aliases || []),
      ...(character.tags || []),
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export function trailingMention(value: string): { query: string } | null {
  const match = /@([^\s@[\]]*)$/.exec(value);
  return match ? { query: match[1] || '' } : null;
}

export function replaceTrailingMention(value: string, replacement: string): string {
  if (/@([^\s@[\]]*)$/.test(value)) {
    return value.replace(/@([^\s@[\]]*)$/, replacement);
  }
  return `${value}${value && !value.endsWith(' ') ? ' ' : ''}${replacement} `;
}
