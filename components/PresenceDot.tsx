'use client';

import { useEditorStore } from '@/store/editorStore';

export default function PresenceDot() {
  const { viewerCount } = useEditorStore();

  return (
    <div className="flex items-center gap-2">
      {/* Animated dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ background: 'var(--accent-green)' }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--accent-green)' }}
        />
      </span>

      {/* Count */}
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--accent-cyan)' }}
      >
        {viewerCount} {viewerCount === 1 ? 'viewer' : 'live'}
      </span>
    </div>
  );
}
