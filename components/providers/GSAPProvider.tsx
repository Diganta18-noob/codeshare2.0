'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function GSAPProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Register GSAP Plugins
    if (typeof window !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      // Default easing and duration setting
      gsap.defaults({
        ease: 'power3.out',
        duration: 0.5,
      });
    }
  }, []);

  return <>{children}</>;
}
