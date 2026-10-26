'use client';

import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

/** Animate panels without changing the dimensions controlled by responsive CSS. */
export function usePanelEntrance(ref: RefObject<HTMLElement>, visible: boolean, direction: 'left' | 'right' | 'bottom' = 'right') {
  useEffect(() => {
    if (!visible || !ref.current) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(ref.current, {
        opacity: 0,
        x: direction === 'left' ? -12 : direction === 'right' ? 12 : 0,
        y: direction === 'bottom' ? 12 : 0,
      }, { opacity: 1, x: 0, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'transform,opacity' });
    });
    return () => media.revert();
  }, [ref, visible, direction]);
}
