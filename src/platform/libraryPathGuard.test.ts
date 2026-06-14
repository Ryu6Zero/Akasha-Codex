import { describe, expect, it } from 'vitest';
import { assertManagedLibraryPath, isManagedLibraryPath, normalizeLibraryPath } from './libraryPathGuard';

describe('libraryPathGuard', () => {
  it('normalizes separators and leading slashes', () => {
    expect(normalizeLibraryPath('\\library\\stories\\a\\images\\b.png')).toBe('library/stories/a/images/b.png');
  });

  it('allows managed character, story, and catalog asset paths', () => {
    expect(isManagedLibraryPath('library/characters/a/avatar/a.png')).toBe(true);
    expect(isManagedLibraryPath('library/stories/a/images/a.png')).toBe(true);
    expect(isManagedLibraryPath('library/catalog-assets/icons/a.png')).toBe(true);
  });

  it('blocks roots, path traversal, and arbitrary data paths', () => {
    expect(isManagedLibraryPath('library/characters')).toBe(false);
    expect(isManagedLibraryPath('library/stories/../catalog.json')).toBe(false);
    expect(isManagedLibraryPath('config/acgplan-settings.json')).toBe(false);
    expect(() => assertManagedLibraryPath('config/acgplan-settings.json', 'delete')).toThrow(/outside managed library assets/);
  });
});
