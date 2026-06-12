import type { AcgplanDesktopApi } from '../types';

export type LibraryPlatform = 'desktop' | 'mobile';

export type LibraryClient = AcgplanDesktopApi & {
  platform: LibraryPlatform;
};

export async function createLibraryClient(): Promise<LibraryClient | null> {
  if (window.acgplan) {
    return { ...window.acgplan, platform: 'desktop' };
  }

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { createMobileLibraryClient } = await import('./mobileLibraryClient');
      return createMobileLibraryClient();
    }
  } catch (error) {
    console.warn('Mobile runtime is unavailable.', error);
  }

  return null;
}
