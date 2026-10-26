import UIIcon from '@/components/UIIcon';

/** A consistent, compact file mark shared by the explorer and tabs. */
export default function FileIcon({ name }: { name: string }) {
  const extension = name.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, { label: string; tone: string }> = {
    js: { label: 'JS', tone: 'amber' }, jsx: { label: 'JS', tone: 'amber' },
    ts: { label: 'TS', tone: 'blue' }, tsx: { label: 'TS', tone: 'blue' },
    py: { label: 'PY', tone: 'blue' }, json: { label: '{}', tone: 'amber' },
    html: { label: '◇', tone: 'coral' }, css: { label: '#', tone: 'blue' },
    cs: { label: 'C#', tone: 'violet' }, md: { label: 'M', tone: 'blue' },
  };
  const type = types[extension];
  return <span className={`ws-file-icon ${type ? `ws-file-${type.tone}` : ''}`} aria-hidden="true">{type ? type.label : <UIIcon name="file" />}</span>;
}
