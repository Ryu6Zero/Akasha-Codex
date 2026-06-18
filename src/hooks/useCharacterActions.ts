import type { Dispatch, SetStateAction } from 'react';
import type { LibraryClient } from '../platform/libraryClient';
import { createEmptyCharacter, mergeCharacters } from '../storage/characterStore';
import type { Character } from '../types';

type UseCharacterActionsOptions = {
  libraryClient: LibraryClient | null | undefined;
  setCharacters: Dispatch<SetStateAction<Character[]>>;
  setSelectedCharacterId: Dispatch<SetStateAction<string | null>>;
};

export function useCharacterActions({
  libraryClient,
  setCharacters,
  setSelectedCharacterId,
}: UseCharacterActionsOptions) {
  async function saveCharacter(character: Character): Promise<Character> {
    const savedCharacter = { ...character, updatedAt: new Date().toISOString() };
    const persistedCharacter = libraryClient ? await libraryClient.saveCharacter(savedCharacter) : savedCharacter;

    setCharacters((currentCharacters) => {
      const exists = currentCharacters.some((currentCharacter) => currentCharacter.id === persistedCharacter.id);
      return exists
        ? currentCharacters.map((currentCharacter) =>
            currentCharacter.id === persistedCharacter.id ? persistedCharacter : currentCharacter,
          )
        : [persistedCharacter, ...currentCharacters];
    });
    setSelectedCharacterId(persistedCharacter.id);
    return persistedCharacter;
  }

  async function deleteCharacter(character: Character): Promise<Character[]> {
    if (libraryClient) {
      const nextCharacters = await libraryClient.deleteCharacter(character);
      setCharacters(nextCharacters);
      setSelectedCharacterId(nextCharacters[0]?.id ?? null);
      return nextCharacters;
    }

    setCharacters((currentCharacters) => currentCharacters.filter((currentCharacter) => currentCharacter.id !== character.id));
    setSelectedCharacterId((currentId) => (currentId === character.id ? null : currentId));
    return [];
  }

  async function deleteCharacters(characters: Character[]): Promise<Character[]> {
    if (!characters.length) return [];

    if (libraryClient) {
      let nextCharacters: Character[] = [];
      for (const character of characters) {
        nextCharacters = await libraryClient.deleteCharacter(character);
      }
      setCharacters(nextCharacters);
      setSelectedCharacterId((currentId) =>
        currentId && nextCharacters.some((character) => character.id === currentId)
          ? currentId
          : nextCharacters[0]?.id ?? null,
      );
      return nextCharacters;
    }

    const deletedIds = new Set(characters.map((character) => character.id));
    setCharacters((currentCharacters) => currentCharacters.filter((character) => !deletedIds.has(character.id)));
    setSelectedCharacterId((currentId) => (currentId && deletedIds.has(currentId) ? null : currentId));
    return [];
  }

  async function importDirectory(): Promise<Character[]> {
    if (!libraryClient) return [];
    const importedCharacters = await libraryClient.importCharacterDirectory();
    if (!importedCharacters.length) return [];

    setCharacters((currentCharacters) => mergeCharacters(importedCharacters, currentCharacters));
    setSelectedCharacterId(importedCharacters[0].id);
    return importedCharacters;
  }

  function createCharacter(selectedCollectionId: string): Character {
    return {
      ...createEmptyCharacter(),
      collectionIds: selectedCollectionId === 'all' ? [] : [selectedCollectionId],
    };
  }

  return {
    createCharacter,
    saveCharacter,
    deleteCharacter,
    deleteCharacters,
    importDirectory,
  };
}
