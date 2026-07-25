'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { gsap } from 'gsap';

export default function PresenceDot() {
  const { viewerCount } = useEditorStore();
  const dotRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (dotRef.current) {
      gsap.fromTo(
        dotRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
    if (countRef.current) {
      gsap.fromTo(
        countRef.current,
        { opacity: 0.3, y: -4 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [viewerCount]);

  return (
    <div className="flex items-center gap-2">
      {/* Animated dot */}
      <span ref={dotRef} className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ background: 'var(--accent-green)' }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: 'var(--accent-green)' }}
        />
      </span>

      {/* Count */}
      <span
        ref={countRef}
        className="text-xs font-semibold tracking-wide inline-block"
        style={{ color: 'var(--text-secondary)' }}
      >
        {viewerCount} {viewerCount === 1 ? 'collaborator' : 'collaborators'}
      </span>
    </div>
  );
}
