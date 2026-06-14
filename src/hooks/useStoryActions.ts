import type { Dispatch, SetStateAction } from 'react';
import type { LibraryClient } from '../platform/libraryClient';
import { normalizeStory } from '../storage/storyStore';
import type { Story, StoryCatalogMetadata } from '../types';

type UseStoryActionsOptions = {
  libraryClient: LibraryClient | null | undefined;
  setStories: Dispatch<SetStateAction<Story[]>>;
  setStoryCatalog: Dispatch<SetStateAction<StoryCatalogMetadata>>;
  setSelectedStoryId: Dispatch<SetStateAction<string | null>>;
};

export function useStoryActions({
  libraryClient,
  setStories,
  setStoryCatalog,
  setSelectedStoryId,
}: UseStoryActionsOptions) {
  async function saveStoryCatalog(catalog: StoryCatalogMetadata): Promise<StoryCatalogMetadata> {
    const persistedCatalog = libraryClient ? await libraryClient.saveStoryCatalog(catalog) : catalog;
    setStoryCatalog(persistedCatalog);
    return persistedCatalog;
  }

  async function saveStory(story: Story): Promise<Story> {
    const storyToSave = normalizeStory({ ...story, updatedAt: new Date().toISOString() });
    const persistedStory = libraryClient ? await libraryClient.saveStory(storyToSave) : storyToSave;

    setStories((currentStories) => {
      const exists = currentStories.some((currentStory) => currentStory.id === persistedStory.id);
      return exists
        ? currentStories.map((currentStory) => (currentStory.id === persistedStory.id ? persistedStory : currentStory))
        : [persistedStory, ...currentStories];
    });
    setSelectedStoryId(persistedStory.id);
    return persistedStory;
  }

  async function deleteStory(story: Story): Promise<Story[]> {
    if (libraryClient) {
      const nextStories = await libraryClient.deleteStory(story);
      setStories(nextStories);
      setSelectedStoryId(nextStories[0]?.id ?? null);
      return nextStories;
    }

    setStories((currentStories) => currentStories.filter((currentStory) => currentStory.id !== story.id));
    setSelectedStoryId((currentId) => (currentId === story.id ? null : currentId));
    return [];
  }

  async function importStoryImage(story: Story, blockId?: string): Promise<Story> {
    if (!libraryClient) return story;
    return libraryClient.importStoryImage(story, blockId);
  }

  async function removeStoryImage(story: Story, assetPath: string): Promise<Story> {
    if (!libraryClient) return story;
    return libraryClient.removeStoryImage(story, assetPath);
  }

  return {
    saveStoryCatalog,
    saveStory,
    deleteStory,
    importStoryImage,
    removeStoryImage,
  };
}
