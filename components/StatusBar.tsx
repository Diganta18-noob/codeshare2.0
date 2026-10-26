'use client';

import { useEditorStore } from '@/store/editorStore';
import { getLabelForLanguage } from '@/lib/languages';
import { useConnectionStatus } from '@/components/providers/useConnectionStatus';
import UIIcon from '@/components/UIIcon';

export default function StatusBar({ roomId }: { roomId: string }) {
  const { code, language, cursorPosition } = useEditorStore();
  const connected = useConnectionStatus();
  return (
    <footer className="ws-statusbar" aria-label="Editor status bar">
      <span className={`ws-connection ${connected ? 'is-connected' : ''}`} role="status"><i />{connected ? 'Connected' : 'Reconnecting'}</span>
      <span className="ws-status-separator" />
      <span className="ws-status-room" title={roomId}><UIIcon name="folder" />{roomId}</span>
      <span className="ws-status-stats">{code.length.toLocaleString()} characters<span>·</span>{code.split('\n').length} {code.includes('\n') ? 'lines' : 'line'}</span>
      <div className="ws-status-right"><span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span><span className="ws-status-encoding">Spaces: 2</span><span className="ws-status-language">{getLabelForLanguage(language)}</span><UIIcon name="code" /></div>
    </footer>
  );
}
