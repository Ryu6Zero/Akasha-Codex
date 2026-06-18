import { useState } from 'react';
import type { AssetCompletenessReport } from '../types';

type AssetReportPanelProps = {
  onGenerateReport: () => Promise<AssetCompletenessReport>;
};

export function AssetReportPanel({ onGenerateReport }: AssetReportPanelProps) {
  const [report, setReport] = useState<AssetCompletenessReport | null>(null);
  const [status, setStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateReport(): Promise<void> {
    setIsGenerating(true);
    setStatus('');
    try {
      setReport(await onGenerateReport());
      setStatus('素材报告已生成');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '素材报告生成失败');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="settings-category-manager glass-panel">
      <div className="settings-section-title">
        <div>
          <p>Assets</p>
          <h3>素材完整性报告</h3>
        </div>
        <button className="primary-button" type="button" disabled={isGenerating} onClick={generateReport}>
          {isGenerating ? '生成中' : '生成报告'}
        </button>
      </div>
      <p className="muted">
        只读扫描当前资料库，输出 JSON 和 Markdown。它只报告缺失引用、孤儿文件和体积排行，不自动删除任何素材。
      </p>

      {report ? (
        <div className="asset-report-grid">
          <ReportStat label="角色" value={report.summary.characterCount} />
          <ReportStat label="头像" value={report.summary.avatarCount} />
          <ReportStat label="立绘" value={report.summary.portraitCount} />
          <ReportStat label="语音" value={report.summary.voiceCount} />
          <ReportStat label="模型" value={report.summary.modelCount} />
          <ReportStat label="附件" value={report.summary.attachmentCount} />
          <ReportStat label="缺失引用" value={report.summary.missingAssetReferenceCount} tone={report.summary.missingAssetReferenceCount ? 'warning' : undefined} />
          <ReportStat label="孤儿文件" value={report.summary.orphanFileCount} tone={report.summary.orphanFileCount ? 'warning' : undefined} />
          <ReportStat label="素材体积" value={formatBytes(report.summary.totalSizeBytes)} />
        </div>
      ) : null}

      {report?.outputPaths ? (
        <div className="asset-report-paths">
          <InfoPath label="JSON" value={report.outputPaths.json} />
          <InfoPath label="Markdown" value={report.outputPaths.markdown} />
        </div>
      ) : null}

      {status ? <span className="settings-save-status">{status}</span> : null}
    </section>
  );
}

function ReportStat({ label, value, tone }: { label: string; value: number | string; tone?: 'warning' }) {
  return (
    <div className={tone === 'warning' ? 'asset-report-stat warning' : 'asset-report-stat'}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InfoPath({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-row">
      <strong>{label}</strong>
      <code>{value}</code>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
