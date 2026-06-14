const MANAGED_LIBRARY_ROOTS = [
  'library/characters',
  'library/stories',
  'library/catalog-assets',
];

export function normalizeLibraryPath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((part) => part && part !== '.')
    .join('/');
}

export function isManagedLibraryPath(path: string): boolean {
  const normalizedPath = normalizeLibraryPath(path);
  if (!normalizedPath || normalizedPath.includes('../') || normalizedPath.split('/').includes('..')) return false;
  return MANAGED_LIBRARY_ROOTS.some((root) => normalizedPath.startsWith(`${root}/`));
}

export function assertManagedLibraryPath(path: string, operation = 'Library file operation'): void {
  if (!isManagedLibraryPath(path)) {
    throw new Error(`${operation} was blocked because the path is outside managed library assets: ${path}`);
  }
}
