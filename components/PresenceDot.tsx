'use client';

import { useEditorStore } from '@/store/editorStore';
import { useConnectionStatus } from '@/components/providers/useConnectionStatus';
import UIIcon from '@/components/UIIcon';

export default function PresenceDot() {
  const { viewerCount } = useEditorStore();
  const connected = useConnectionStatus();
  return (
    <div className={`ws-collaborators ${connected ? 'is-connected' : ''}`} title={connected ? `${viewerCount} ${viewerCount === 1 ? 'person' : 'people'} in this room` : 'Waiting for the collaboration server'}>
      <span className="ws-avatar"><UIIcon name="people" /></span>
      <span className="ws-presence-dot" />
      <span>{connected ? `${viewerCount} online` : 'Connecting…'}</span>
    </div>
  );
}
