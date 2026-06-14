import type { VoiceAsset } from '../../types';
import { VoiceAssetPlayer } from './VoiceAssetPlayer';

type VoiceSectionProps = {
  voices: VoiceAsset[];
  isEditing: boolean;
  canImport: boolean;
  onImport: () => void;
  onUpdateVoice: (voiceId: string, field: 'label' | 'line', value: string) => void;
  onRemove: (assetPath: string) => void;
};

export function VoiceSection({
  voices,
  isEditing,
  canImport,
  onImport,
  onUpdateVoice,
  onRemove,
}: VoiceSectionProps) {
  return (
    <section className="glass-panel">
      <h2>语音</h2>
      {isEditing ? <button type="button" disabled={!canImport} onClick={onImport}>导入语音</button> : null}
      <div className="voice-panel-list">
        {voices.length ? (
          voices.map((voice) => (
            <article key={voice.id}>
              {isEditing ? (
                <div className="voice-editor-row">
                  <input value={voice.label} onChange={(event) => onUpdateVoice(voice.id, 'label', event.target.value)} placeholder="语音名称" />
                  <input value={voice.line || ''} onChange={(event) => onUpdateVoice(voice.id, 'line', event.target.value)} placeholder="台词文本" />
                  <button className="danger-button" type="button" onClick={() => onRemove(voice.filePath)}>删除</button>
                </div>
              ) : (
                <VoiceAssetPlayer voice={voice} />
              )}
            </article>
          ))
        ) : (
          <p>暂无语音。</p>
        )}
      </div>
    </section>
  );
}
