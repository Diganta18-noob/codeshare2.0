'use client';

import { useEffect, type RefObject } from 'react';

/** Keep keyboard focus inside mobile drawers, including across viewport changes. */
export function useMobileDrawer(ref: RefObject<HTMLElement>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open || !ref.current) return;
    const panel = ref.current;
    const media = window.matchMedia('(max-width: 768px)');
    let release = () => {};
    const synchronize = () => {
      release();
      release = () => {};
      if (!media.matches) return;
      const opener = document.activeElement as HTMLElement | null;
      const getControls = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
      const timer = window.setTimeout(() => getControls()[0]?.focus(), 0);
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key !== 'Tab') return;
        const controls = getControls();
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      };
      document.addEventListener('keydown', onKeyDown);
      release = () => {
        window.clearTimeout(timer);
        document.removeEventListener('keydown', onKeyDown);
        if (opener?.isConnected) opener.focus();
      };
    };
    synchronize();
    media.addEventListener('change', synchronize);
    return () => { media.removeEventListener('change', synchronize); release(); };
  }, [ref, open, onClose]);
}
