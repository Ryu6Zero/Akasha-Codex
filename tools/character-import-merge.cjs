function unique(values) {
  return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
}

function uniqueObjects(values) {
  const seen = new Set();
  return (values || []).flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const key = JSON.stringify(value);
    if (seen.has(key)) return [];
    seen.add(key);
    return [value];
  });
}

function normalizeProfileFields(profileFields) {
  if (!Array.isArray(profileFields)) return [];
  const seen = new Set();

  return profileFields.flatMap((field, index) => {
    const label = String(field?.label || '').trim();
    const value = String(field?.value || '').trim();
    const group = String(field?.group || '').trim();
    const id = String(field?.id || '').trim() || `profile-${index + 1}`;
    if (!label || !value) return [];

    const key = id || `${label.toLowerCase()}\u0000${value.toLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);

    return [{
      id,
      label,
      value,
      ...(group ? { group } : {}),
    }];
  });
}

function mergeProfileFields(existingFields, incomingFields) {
  const merged = [];
  const indexById = new Map();
  const valueKeys = new Set();

  for (const field of normalizeProfileFields(existingFields)) {
    indexById.set(field.id, merged.length);
    valueKeys.add(profileValueKey(field));
    merged.push(field);
  }

  for (const field of normalizeProfileFields(incomingFields)) {
    const existingIndex = indexById.get(field.id);
    if (existingIndex !== undefined) {
      merged[existingIndex] = { ...merged[existingIndex], ...field };
      valueKeys.add(profileValueKey(field));
      continue;
    }

    const valueKey = profileValueKey(field);
    if (valueKeys.has(valueKey)) continue;
    indexById.set(field.id, merged.length);
    valueKeys.add(valueKey);
    merged.push(field);
  }

  return merged;
}

function mergeImportedCharacter(existingCharacter, incomingCharacter) {
  const existing = existingCharacter || {};
  const incoming = incomingCharacter || {};

  return {
    ...existing,
    ...incoming,
    aliases: unique([...(existing.aliases || []), ...(incoming.aliases || [])]),
    tags: unique([...(existing.tags || []), ...(incoming.tags || [])]),
    collectionIds: unique([...(existing.collectionIds || []), ...(incoming.collectionIds || [])]),
    profileFields: mergeProfileFields(existing.profileFields, incoming.profileFields),
    description: preserveUserText(existing.description, incoming.description),
    notes: preserveUserText(existing.notes, incoming.notes),
    avatarPaths: unique([...(incoming.avatarPaths || []), ...(existing.avatarPaths || [])]),
    portraitPaths: unique([...(existing.portraitPaths || []), ...(incoming.portraitPaths || [])]),
    voicePaths: unique([...(existing.voicePaths || []), ...(incoming.voicePaths || [])]),
    voiceAssets: mergeVoiceAssets(existing.voiceAssets, incoming.voiceAssets),
    attachmentPaths: unique([...(existing.attachmentPaths || []), ...(incoming.attachmentPaths || [])]),
    modelPaths: unique([...(existing.modelPaths || []), ...(incoming.modelPaths || [])]),
    externalRefs: uniqueObjects([...(existing.externalRefs || []), ...(incoming.externalRefs || [])]),
    importMeta: {
      ...(existing.importMeta || {}),
      ...(incoming.importMeta || {}),
    },
    createdAt: existing.createdAt || incoming.createdAt,
    updatedAt: incoming.updatedAt || existing.updatedAt,
  };
}

function createProfileFields(group, entries, prefix = group) {
  return entries.flatMap(([label, value]) => {
    const normalizedValue = String(value || '').trim();
    if (!label || !normalizedValue) return [];
    return [{
      id: `imported-${slug(prefix)}-${slug(label)}`,
      group,
      label,
      value: normalizedValue,
    }];
  });
}

function mergeVoiceAssets(existingVoiceAssets, incomingVoiceAssets) {
  const seen = new Set();
  return [...(existingVoiceAssets || []), ...(incomingVoiceAssets || [])].flatMap((voice) => {
    if (!voice || typeof voice !== 'object') return [];
    const key = String(voice.id || voice.filePath || JSON.stringify(voice));
    if (seen.has(key)) return [];
    seen.add(key);
    return [voice];
  });
}

function preserveUserText(existingValue, incomingValue) {
  const existingText = String(existingValue || '').trim();
  if (existingText) return existingValue;
  return String(incomingValue || '');
}

function profileValueKey(field) {
  return `${String(field.label || '').trim().toLowerCase()}\u0000${String(field.value || '').trim().toLowerCase()}`;
}

function slug(value) {
  return String(value || 'field')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'field';
}

module.exports = {
  createProfileFields,
  mergeImportedCharacter,
  mergeProfileFields,
  normalizeProfileFields,
  unique,
  uniqueObjects,
};
