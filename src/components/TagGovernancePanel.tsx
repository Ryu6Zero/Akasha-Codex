import { useState } from 'react';
import type { TagGovernanceItem } from '../storage/tagGovernance';

type TagGovernancePanelProps = {
  tagGovernanceItems: TagGovernanceItem[];
  onMergeCharacterTag: (sourceTag: string, targetTag: string) => void | Promise<void>;
  onDeleteUnusedCharacterTagRule: (tag: string) => void | Promise<void>;
};

export function TagGovernancePanel({
  tagGovernanceItems,
  onMergeCharacterTag,
  onDeleteUnusedCharacterTagRule,
}: TagGovernancePanelProps) {
  const [sourceTag, setSourceTag] = useState('');
  const [targetTag, setTargetTag] = useState('');
  const [status, setStatus] = useState('');

  const invalidRuleCount = tagGovernanceItems.filter((item) => item.isInvalidRule).length;
  const usedTagCount = tagGovernanceItems.filter((item) => item.characterCount > 0).length;

  async function mergeTag(): Promise<void> {
    try {
      await onMergeCharacterTag(sourceTag, targetTag);
      setSourceTag('');
      setTargetTag('');
      setStatus('标签已合并');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '标签合并失败');
    }
  }

  async function deleteUnusedTagRule(tag: string): Promise<void> {
    try {
      await onDeleteUnusedCharacterTagRule(tag);
      setStatus(`已清理失效标签规则：${tag}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '清理失败');
    }
  }

  return (
    <section className="settings-category-manager glass-panel">
      <div className="settings-section-title">
        <div>
          <p>Tags</p>
          <h3>标签治理</h3>
        </div>
        <div className="tag-governance-summary">
          <span>{usedTagCount} 个已用标签</span>
          <span className={invalidRuleCount ? 'tag-governance-warning' : ''}>{invalidRuleCount} 条失效规则</span>
        </div>
      </div>
      <p className="muted">
        这里统一处理角色标签和分组匹配规则。合并会同时改角色标签和分组规则；删除只允许清理没有角色使用的失效规则。
      </p>

      <div className="tag-governance-controls">
        <label>
          源标签
          <select value={sourceTag} onChange={(event) => {
            setSourceTag(event.target.value);
            setStatus('');
          }}>
            <option value="">选择要处理的标签</option>
            {tagGovernanceItems.map((item) => (
              <option key={item.tag} value={item.tag}>
                {item.tag}
              </option>
            ))}
          </select>
        </label>
        <label>
          目标标签
          <input
            list="tag-governance-targets"
            value={targetTag}
            onChange={(event) => {
              setTargetTag(event.target.value);
              setStatus('');
            }}
            placeholder="输入新标签或选择已有标签"
          />
        </label>
        <datalist id="tag-governance-targets">
          {tagGovernanceItems.map((item) => (
            <option key={item.tag} value={item.tag} />
          ))}
        </datalist>
        <button className="primary-button" type="button" disabled={!sourceTag || !targetTag} onClick={mergeTag}>
          合并 / 重命名
        </button>
      </div>

      <div className="tag-governance-list">
        {tagGovernanceItems.length ? (
          tagGovernanceItems.map((item) => (
            <article className={item.isInvalidRule ? 'tag-governance-row invalid' : 'tag-governance-row'} key={item.tag}>
              <div>
                <strong>{item.tag}</strong>
                <small>{item.isInvalidRule ? '只存在于分组规则，当前没有角色使用' : '角色标签与分组规则状态正常'}</small>
              </div>
              <span>{item.characterCount} 角色</span>
              <span>{item.collectionRuleCount} 分组规则</span>
              <div className="tag-governance-actions">
                <button type="button" onClick={() => {
                  setSourceTag(item.tag);
                  setTargetTag('');
                  setStatus('');
                }}>
                  设为源
                </button>
                <button
                  className={item.isInvalidRule ? 'danger-button' : ''}
                  type="button"
                  disabled={item.characterCount > 0 || item.collectionRuleCount === 0}
                  onClick={() => deleteUnusedTagRule(item.tag)}
                >
                  清理规则
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="muted">当前资料库还没有角色标签。</p>
        )}
      </div>

      {status ? <span className="settings-save-status">{status}</span> : null}
    </section>
  );
}
