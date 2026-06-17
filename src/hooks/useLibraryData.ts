import { useCallback, useEffect, useState } from 'react';
import { defaultCatalog } from '../data/defaultCatalog';
import { defaultStoryCatalog } from '../data/defaultStoryCatalog';
import { sampleCharacters } from '../data/sampleCharacters';
import { sampleStories } from '../data/sampleStories';
import { createLibraryClient, type LibraryClient } from '../platform/libraryClient';
import type { CatalogMetadata, Character, LibrarySettings, SortMode, Story, StoryCatalogMetadata } from '../types';

function mergeCharacterDetail(characters: Character[], character: Character): Character[] {
  const exists = characters.some((currentCharacter) => currentCharacter.id === character.id);
  return exists
    ? characters.map((currentCharacter) => (currentCharacter.id === character.id ? character : currentCharacter))
    : [character, ...characters];
}

export function useLibraryData() {
  const [libraryClient, setLibraryClient] = useState<LibraryClient | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<CatalogMetadata>(defaultCatalog);
  const [characters, setCharacters] = useState<Character[]>(sampleCharacters);
  const [storyCatalog, setStoryCatalog] = useState<StoryCatalogMetadata>(defaultStoryCatalog);
  const [stories, setStories] = useState<Story[]>(sampleStories);
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(sampleStories[0]?.id ?? null);
  const [sortMode, setSortMode] = useState<SortMode>('updatedAt');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    createLibraryClient().then((client) => {
      if (isMounted) setLibraryClient(client);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const reloadLibrary = useCallback(async (): Promise<void> => {
    if (libraryClient === undefined) return;
    setIsLoading(true);

    if (!libraryClient) {
      setCatalog(defaultCatalog);
      setCharacters(sampleCharacters);
      setStoryCatalog(defaultStoryCatalog);
      setStories(sampleStories);
      setSelectedCharacterId(sampleCharacters[0]?.id ?? null);
      setSelectedStoryId(sampleStories[0]?.id ?? null);
      setIsLoading(false);
      return;
    }

    const [nextSettings, nextCatalog, nextStoryCatalog, nextCharacters, nextStories] = await Promise.all([
      libraryClient.getSettings(),
      libraryClient.getCatalog(),
      libraryClient.getStoryCatalog(),
      libraryClient.getLibraryCharacterSummaries(),
      libraryClient.getStories(),
    ]);

    setSettings(nextSettings);
    setCatalog(nextCatalog);
    setStoryCatalog(nextStoryCatalog);
    setSortMode(nextCatalog.defaultSortMode);
    setCharacters(nextCharacters);
    setStories(nextStories);
    setSelectedCharacterId((currentId) => {
      if (currentId && nextCharacters.some((character) => character.id === currentId)) return currentId;
      return nextCharacters[0]?.id ?? null;
    });
    setSelectedStoryId((currentId) => {
      if (currentId && nextStories.some((story) => story.id === currentId)) return currentId;
      return nextStories[0]?.id ?? null;
    });
    setIsLoading(false);
  }, [libraryClient]);

  const loadCharacterDetail = useCallback(async (characterId: string): Promise<Character | null> => {
    if (!libraryClient) {
      return characters.find((character) => character.id === characterId) || null;
    }

    const character = await libraryClient.getCharacter(characterId);
    if (!character) return null;
    setCharacters((currentCharacters) => mergeCharacterDetail(currentCharacters, character));
    return character;
  }, [characters, libraryClient]);

  useEffect(() => {
    reloadLibrary();
  }, [reloadLibrary]);

  return {
    libraryClient,
    catalog,
    setCatalog,
    characters,
    setCharacters,
    storyCatalog,
    setStoryCatalog,
    stories,
    setStories,
    settings,
    setSettings,
    selectedCharacterId,
    setSelectedCharacterId,
    selectedStoryId,
    setSelectedStoryId,
    sortMode,
    setSortMode,
    isLoading,
    reloadLibrary,
    loadCharacterDetail,
  };
}
