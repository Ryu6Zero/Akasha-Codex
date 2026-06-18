function createAssetReportService(context) {
  const { fs, path } = context;

  function generateAssetCompletenessReport() {
    context.ensureLibraryStructure();
    const generatedAt = new Date().toISOString();
    const characters = loadCharacterRecords();
    const characterReports = characters.map(({ character, directory }) => createCharacterReport(character, directory));
    const report = {
      generatedAt,
      libraryRoot: context.getLibraryRoot(),
      summary: createSummary(characterReports),
      largestCharacters: [...characterReports].sort((a, b) => b.totalSizeBytes - a.totalSizeBytes).slice(0, 20),
      characters: characterReports,
    };
    const outputPaths = writeReports(report);
    return { ...report, outputPaths };
  }

  function loadCharacterRecords() {
    return fs
      .readdirSync(context.getCharactersRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(context.getCharactersRoot(), entry.name))
      .filter((directory) => fs.existsSync(path.join(directory, 'character.json')))
      .flatMap((directory) => {
        const character = context.readJsonFile(path.join(directory, 'character.json'), null);
        return character ? [{ character: { ...character, libraryDirectory: directory }, directory }] : [];
      });
  }

  function createCharacterReport(character, directory) {
    const referencedPaths = collectReferencedAssetPaths(character);
    const existingFiles = listCharacterFiles(directory);
    const existingByResolvedPath = new Map(existingFiles.map((file) => [resolvePath(file.path), file]));
    const referencedResolvedPaths = new Set(referencedPaths.map(resolvePath).filter(Boolean));
    const missingAssetReferences = referencedPaths
      .filter((filePath) => !existingByResolvedPath.has(resolvePath(filePath)))
      .map((filePath) => ({ path: filePath }));
    const orphanFiles = existingFiles
      .filter((file) => path.basename(file.path) !== 'character.json')
      .filter((file) => !referencedResolvedPaths.has(resolvePath(file.path)))
      .map((file) => ({ path: file.path, sizeBytes: file.sizeBytes }));
    const assetFiles = existingFiles.filter((file) => path.basename(file.path) !== 'character.json');

    return {
      characterId: character.id,
      name: character.name || character.id,
      sourceTitle: character.sourceTitle || '',
      counts: {
        avatars: unique([character.avatarPath, ...(character.avatarPaths || [])]).length,
        portraits: unique([character.portraitPath, ...(character.portraitPaths || [])]).length,
        voices: unique([
          ...(character.voicePaths || []),
          ...((character.voiceAssets || []).map((voice) => voice.filePath)),
        ]).length,
        models: unique([character.modelPath, ...(character.modelPaths || [])]).length,
        attachments: unique(character.attachmentPaths || []).length,
      },
      missingFlags: {
        primaryAvatar: !character.avatarPath && !(character.avatarPaths || []).length,
        portrait: !character.portraitPath && !(character.portraitPaths || []).length,
        description: !String(character.description || '').trim(),
      },
      missingAssetReferences,
      orphanFiles,
      totalSizeBytes: assetFiles.reduce((total, file) => total + file.sizeBytes, 0),
    };
  }

  function collectReferencedAssetPaths(character) {
    return unique([
      character.avatarPath,
      ...(character.avatarPaths || []),
      character.portraitPath,
      ...(character.portraitPaths || []),
      character.modelPath,
      ...(character.modelPaths || []),
      ...(character.attachmentPaths || []),
      ...(character.voicePaths || []),
      ...((character.voiceAssets || []).map((voice) => voice.filePath)),
    ]);
  }

  function listCharacterFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return context.listFilesRecursive(directory).map((filePath) => ({
      path: filePath,
      sizeBytes: fs.statSync(filePath).size,
    }));
  }

  function createSummary(characterReports) {
    return characterReports.reduce(
      (summary, report) => ({
        characterCount: summary.characterCount + 1,
        avatarCount: summary.avatarCount + report.counts.avatars,
        portraitCount: summary.portraitCount + report.counts.portraits,
        voiceCount: summary.voiceCount + report.counts.voices,
        modelCount: summary.modelCount + report.counts.models,
        attachmentCount: summary.attachmentCount + report.counts.attachments,
        missingAssetReferenceCount: summary.missingAssetReferenceCount + report.missingAssetReferences.length,
        orphanFileCount: summary.orphanFileCount + report.orphanFiles.length,
        totalSizeBytes: summary.totalSizeBytes + report.totalSizeBytes,
      }),
      {
        characterCount: 0,
        avatarCount: 0,
        portraitCount: 0,
        voiceCount: 0,
        modelCount: 0,
        attachmentCount: 0,
        missingAssetReferenceCount: 0,
        orphanFileCount: 0,
        totalSizeBytes: 0,
      },
    );
  }

  function writeReports(report) {
    const reportsRoot = path.join(context.getLibraryRoot(), 'reports');
    context.ensureDirectory(reportsRoot);
    const stamp = report.generatedAt.replace(/[:.]/g, '-');
    const jsonPath = path.join(reportsRoot, `asset-report-${stamp}.json`);
    const markdownPath = path.join(reportsRoot, `asset-report-${stamp}.md`);
    fs.writeFileSync(jsonPath, JSON.stringify({ ...report, outputPaths: { json: jsonPath, markdown: markdownPath } }, null, 2), 'utf8');
    fs.writeFileSync(markdownPath, renderMarkdown({ ...report, outputPaths: { json: jsonPath, markdown: markdownPath } }), 'utf8');
    return { json: jsonPath, markdown: markdownPath };
  }

  function renderMarkdown(report) {
    const lines = [
      '# 绯典阁素材完整性报告',
      '',
      `生成时间：${report.generatedAt}`,
      `资料库：${report.libraryRoot}`,
      '',
      '## 汇总',
      '',
      `- 角色数：${report.summary.characterCount}`,
      `- 头像引用：${report.summary.avatarCount}`,
      `- 立绘引用：${report.summary.portraitCount}`,
      `- 语音引用：${report.summary.voiceCount}`,
      `- 模型引用：${report.summary.modelCount}`,
      `- 附件引用：${report.summary.attachmentCount}`,
      `- 缺失引用：${report.summary.missingAssetReferenceCount}`,
      `- 孤儿文件：${report.summary.orphanFileCount}`,
      `- 角色素材体积：${formatBytes(report.summary.totalSizeBytes)}`,
      '',
      '## 最大体积角色 Top 20',
      '',
      '| 排名 | 角色 | 来源 | 体积 | 缺失引用 | 孤儿文件 |',
      '| --- | --- | --- | ---: | ---: | ---: |',
      ...report.largestCharacters.map((character, index) =>
        `| ${index + 1} | ${escapeTable(character.name)} | ${escapeTable(character.sourceTitle)} | ${formatBytes(character.totalSizeBytes)} | ${character.missingAssetReferences.length} | ${character.orphanFiles.length} |`,
      ),
      '',
      '## 问题角色',
      '',
    ];

    const issueCharacters = report.characters
      .filter((character) => character.missingAssetReferences.length || character.orphanFiles.length || Object.values(character.missingFlags).some(Boolean));
    issueCharacters.forEach((character) => {
        lines.push(`### ${character.name}`, '');
        lines.push(`- ID：${character.characterId}`);
        lines.push(`- 来源：${character.sourceTitle || '-'}`);
        lines.push(`- 体积：${formatBytes(character.totalSizeBytes)}`);
        if (character.missingFlags.primaryAvatar) lines.push('- 缺主头像');
        if (character.missingFlags.portrait) lines.push('- 缺立绘');
        if (character.missingFlags.description) lines.push('- 缺简介');
        character.missingAssetReferences.forEach((file) => lines.push(`- 缺失引用：${file.path}`));
        character.orphanFiles.forEach((file) => lines.push(`- 孤儿文件：${file.path} (${formatBytes(file.sizeBytes || 0)})`));
        lines.push('');
      });

    if (!issueCharacters.length) lines.push('当前没有发现缺失引用或孤儿文件。', '');
    return `${lines.join('\n')}\n`;
  }

  function resolvePath(filePath) {
    return filePath ? path.resolve(filePath) : '';
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function escapeTable(value) {
    return String(value || '-').replace(/\|/g, '\\|');
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  return { generateAssetCompletenessReport };
}

module.exports = { createAssetReportService };
