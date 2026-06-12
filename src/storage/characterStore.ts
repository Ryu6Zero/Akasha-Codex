import type { Character, VoiceAsset } from '../types';

export function createEmptyCharacter(): Character {
  const now = new Date().toISOString();

  return normalizeCharacter({
    id: crypto.randomUUID(),
    name: '',
    sourceTitle: '',
    aliases: [],
    tags: [],
    collectionIds: [],
    description: '',
    notes: '',
    voicePaths: [],
    voiceAssets: [],
    attachmentPaths: [],
    createdAt: now,
    updatedAt: now,
  });
}

export function normalizeCharacter(character: Partial<Character> & Pick<Character, 'id'>): Character {
  const tags = Array.isArray(character.tags)
    ? character.tags
    : String(character.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
  const voiceAssets = normalizeVoiceAssets(character.voiceAssets, character.voicePaths);
  const portraitPaths = Array.isArray(character.portraitPaths)
    ? character.portraitPaths.filter(Boolean)
    : character.portraitPath
      ? [character.portraitPath]
      : [];
  const avatarPaths = Array.isArray(character.avatarPaths)
    ? character.avatarPaths.filter(Boolean)
    : character.avatarPath
      ? [character.avatarPath]
      : [];
  const portraitPath = character.portraitPath || portraitPaths[0];
  const avatarPath = character.avatarPath || avatarPaths[0] || portraitPath;
  const modelPaths = Array.isArray(character.modelPaths)
    ? character.modelPaths.filter(Boolean)
    : character.modelPath
      ? [character.modelPath]
      : [];

  return {
    ...character,
    id: character.id,
    name: character.name || '',
    sourceTitle: character.sourceTitle || '',
    aliases: character.aliases || [],
    tags,
    collectionIds: character.collectionIds || [],
    description: character.description || '',
    notes: character.notes || '',
    avatarPath,
    avatarPaths,
    portraitPath,
    portraitPaths,
    voicePaths: character.voicePaths || voiceAssets.map((voice) => voice.filePath),
    voiceAssets,
    modelPath: character.modelPath || modelPaths[0],
    modelPaths,
    attachmentPaths: character.attachmentPaths || [],
    createdAt: character.createdAt || new Date().toISOString(),
    updatedAt: character.updatedAt || new Date().toISOString(),
  };
}

function normalizeVoiceAssets(voiceAssets?: VoiceAsset[], voicePaths?: string[]): VoiceAsset[] {
  if (Array.isArray(voiceAssets)) {
    return voiceAssets.map((voice, index) => ({
      id: voice.id || `voice-${index + 1}`,
      label: voice.label || voice.fileName || `语音 ${index + 1}`,
      line: voice.line || '',
      subtitle: voice.subtitle || '',
      category: voice.category || '',
      sourceUrl: voice.sourceUrl || '',
      sourceIds: voice.sourceIds || [],
      conditionText: voice.conditionText || '',
      filePath: voice.filePath,
      fileUrl: voice.fileUrl,
      fileName: voice.fileName || voice.filePath.split(/[\\/]/).pop(),
    }));
  }

  return (voicePaths || []).map((filePath, index) => ({
    id: `legacy-voice-${index + 1}`,
    label: filePath.split(/[\\/]/).pop() || `语音 ${index + 1}`,
    line: '',
    filePath,
    fileName: filePath.split(/[\\/]/).pop(),
  }));
}

export function mergeCharacters(primaryCharacters: Character[], fallbackCharacters: Character[]): Character[] {
  const charactersById = new Map<string, Character>();

  fallbackCharacters.forEach((character) => charactersById.set(character.id, normalizeCharacter(character)));
  primaryCharacters.forEach((character) => charactersById.set(character.id, normalizeCharacter(character)));

  return Array.from(charactersById.values());
}
