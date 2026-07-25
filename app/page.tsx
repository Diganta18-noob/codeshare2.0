'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [customName, setCustomName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const ctaBoxRef = useRef<HTMLDivElement>(null);
  const randomBtnRef = useRef<HTMLDivElement>(null);
  const mockEditorRef = useRef<HTMLDivElement>(null);
  const codeLinesRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);
  const gridPatternRef = useRef<HTMLDivElement>(null);

  const mockCodeLines = [
    'const codeshare = require("codeshare");',
    'const room = codeshare.join("diganta");',
    '',
    'room.on("collaborator_join", (user) => {',
    '  console.log(`${user.name} joined!`);',
    '  // Live sync active... 🚀',
    '});'
  ];

  // GSAP Animations setup
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Aurora Blobs Floating Loop
      if (blob1Ref.current && blob2Ref.current && blob3Ref.current) {
        gsap.to(blob1Ref.current, {
          x: 60,
          y: 40,
          scale: 1.1,
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        gsap.to(blob2Ref.current, {
          x: -50,
          y: -30,
          scale: 0.9,
          duration: 10,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        gsap.to(blob3Ref.current, {
          x: 40,
          y: -60,
          scale: 1.15,
          duration: 9,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // 2. Hero Headline Character-by-Character Stagger Reveal (StringTune style)
      const chars = heroTitleRef.current?.querySelectorAll('.hero-char');
      if (chars && chars.length > 0) {
        gsap.fromTo(
          chars,
          { opacity: 0, y: 25, rotateX: -45 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.6,
            stagger: 0.025,
            ease: 'power3.out',
            delay: 0.1,
          }
        );
      }

      // 3. Subtitle Fade & Upward Float
      if (heroSubRef.current) {
        gsap.fromTo(
          heroSubRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, delay: 0.45, ease: 'power3.out' }
        );
      }

      // 4. CTA Input & Random Button Spring Reveal
      if (ctaBoxRef.current) {
        gsap.fromTo(
          ctaBoxRef.current,
          { opacity: 0, y: 30, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, delay: 0.6, ease: 'back.out(1.4)' }
        );
      }
      if (randomBtnRef.current) {
        gsap.fromTo(
          randomBtnRef.current,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.6, delay: 0.75, ease: 'power3.out' }
        );
      }

      // 5. Mock Editor Window Entrance with 3D perspective
      if (mockEditorRef.current) {
        gsap.fromTo(
          mockEditorRef.current,
          { opacity: 0, y: 40, rotateX: 12, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            duration: 1,
            delay: 0.3,
            ease: 'power3.out',
          }
        );
      }

      // 6. Code Lines Type-in / Staggered Line Reveal
      const lines = codeLinesRef.current?.querySelectorAll('.mock-code-line');
      if (lines && lines.length > 0) {
        gsap.fromTo(
          lines,
          { opacity: 0, x: -10 },
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            stagger: 0.12,
            delay: 0.8,
            ease: 'power2.out',
          }
        );
      }

      // 7. Fake Collaborative Cursors Smooth GSAP Pulse Timeline
      const cursors = mockEditorRef.current?.querySelectorAll('.fake-cursor-pulse');
      if (cursors && cursors.length > 0) {
        gsap.to(cursors, {
          opacity: 0.2,
          duration: 0.7,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        });
      }

      // 8. ScrollTrigger Stagger for Feature Cards
      const cardElements = cardsRef.current?.querySelectorAll('.glass-card');
      if (cardElements && cardElements.length > 0) {
        gsap.fromTo(
          cardElements,
          { opacity: 0, y: 40, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 85%',
            },
          }
        );
      }
    }, containerRef);

    // Mousemove parallax shift on grid pattern background
    const handleMouseMove = (e: MouseEvent) => {
      if (!gridPatternRef.current) return;
      const { clientX, clientY } = e;
      const xPercent = (clientX / window.innerWidth - 0.5) * 15;
      const yPercent = (clientY / window.innerHeight - 0.5) * 15;
      gsap.to(gridPatternRef.current, {
        x: xPercent,
        y: yPercent,
        duration: 0.8,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      ctx.revert();
    };
  }, []);

  // 3D Perspective Tilt on Card Hover
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = (-y / rect.height) * 12;
    const rotateY = (x / rect.width) * 12;

    gsap.to(card, {
      rotateX: rotateX,
      rotateY: rotateY,
      transformPerspective: 1000,
      scale: 1.02,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.5,
      ease: 'power3.out',
    });
  };

  // Icon Spin Pop on Hover
  const handleIconHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const icon = e.currentTarget;
    gsap.to(icon, {
      rotate: 15,
      scale: 1.15,
      duration: 0.25,
      yoyo: true,
      repeat: 1,
      ease: 'back.out(2)',
    });
  };

  const handleCreatePad = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      router.push(`/c/${data.roomId}`);
    } catch (err) {
      console.error('Failed to create pad:', err);
      setIsCreating(false);
    }
  };

  const handleCustomJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim();
    if (name) {
      router.push(`/c/${encodeURIComponent(name)}`);
    }
  };

  // Helper to split text into character spans for GSAP stagger
  const splitTextToChars = (text: string) => {
    return text.split('').map((char, index) => (
      <span key={index} className="hero-char">
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen lg:h-screen flex-col justify-between overflow-y-auto lg:overflow-hidden overflow-x-hidden"
    >
      {/* Parallax Grid Background */}
      <div ref={gridPatternRef} className="grid-pattern absolute inset-0 pointer-events-none" />

      {/* Live Aurora Mesh */}
      <div className="aurora-mesh">
        <div ref={blob1Ref} className="aurora-blob aurora-blob-1" />
        <div ref={blob2Ref} className="aurora-blob aurora-blob-2" />
        <div ref={blob3Ref} className="aurora-blob aurora-blob-3" />
      </div>

      <div className="noise-overlay" />

      {/* Header Navigation */}
      <header className="relative z-10 mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6 lg:px-8 border-b border-[rgba(255,255,255,0.03)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-tight" style={{ color: 'var(--accent-primary)' }}>
            {'{ codeshare }'}
          </span>
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold text-indigo-400 border border-indigo-500/20">
            v2.0
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/Diganta18-noob/codeshare2.0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
            </svg>
            GitHub
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto flex flex-1 w-full max-w-7xl flex-col justify-center px-6 py-6 lg:py-0 flex-shrink-0">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8 items-center">
          
          {/* Left Column: CTA & Info */}
          <div className="flex flex-col lg:col-span-6">
            <h1
              ref={heroTitleRef}
              className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl font-sans leading-tight"
            >
              {splitTextToChars('Share code in ')}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 bg-clip-text text-transparent inline-block">
                {splitTextToChars('real-time')}
              </span>
              {splitTextToChars('.')}
            </h1>
            <p
              ref={heroSubRef}
              className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] max-w-lg leading-relaxed"
            >
              No registration, no configuration, no setup. Type your code, share your unique room URL, and write code collaboratively with peers instantly.
            </p>

            {/* Custom Join Box */}
            <div ref={ctaBoxRef} className="mt-8 w-full max-w-md">
              <form onSubmit={handleCustomJoin} className="flex flex-col gap-3">
                <div className="group relative flex items-center rounded-xl border border-[var(--bg-border)] bg-[rgba(11,15,25,0.8)] p-1.5 focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary-glow)] transition-all">
                  <span className="flex items-center gap-2 pl-4 text-xs font-mono text-[var(--text-dim)] select-none">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    codeshare/
                    <span className="cursor-blink text-[var(--accent-primary)] font-bold">|</span>
                  </span>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="your-room-name"
                    className="flex-1 bg-transparent py-2 px-1 font-mono text-xs text-[var(--text-primary)] outline-none placeholder-[var(--text-dim)]"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="submit"
                    disabled={!customName.trim()}
                    className="btn-premium btn-premium-primary py-2 px-4 text-xs disabled:opacity-50"
                  >
                    Go →
                  </button>
                </div>
              </form>
            </div>

            {/* Divider / Or */}
            <div className="mt-4 flex w-full max-w-md items-center gap-3">
              <div className="h-[1px] flex-1 bg-[var(--bg-border)]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">or</span>
              <div className="h-[1px] flex-1 bg-[var(--bg-border)]" />
            </div>

            {/* Random Room Button */}
            <div ref={randomBtnRef} className="mt-4">
              <button
                onClick={handleCreatePad}
                disabled={isCreating}
                className="btn-premium btn-premium-ghost py-2.5 px-5 text-xs"
              >
                {isCreating ? (
                  <>
                    <span className="editor-skeleton-pulse mr-2" style={{ width: 12, height: 12, borderWidth: 2 }} />
                    Generating your room...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create a Random Workspace
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Premium Mock Collaboration Editor */}
          <div className="relative lg:col-span-6 w-full max-w-xl mx-auto">
            <div ref={mockEditorRef} className="mock-editor-window">
              {/* Header */}
              <div className="mock-editor-header justify-between">
                <div className="flex items-center">
                  <span className="mock-dot bg-[#ef4444]" />
                  <span className="mock-dot bg-[#f59e0b]" />
                  <span className="mock-dot bg-[#10b981]" />
                  <span className="ml-4 font-mono text-[10px] text-[var(--text-dim)]">collaboration_demo.js</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                  <span className="font-mono text-[9px] text-[var(--text-secondary)]">2 connected</span>
                </div>
              </div>
              
              {/* Code Panel */}
              <div ref={codeLinesRef} className="p-5 font-mono text-xs leading-relaxed text-[var(--text-secondary)] overflow-hidden min-h-[180px]">
                {mockCodeLines.map((line, idx) => (
                  <div key={idx} className="mock-code-line flex relative">
                    <span className="w-8 text-[var(--text-dim)] select-none text-right pr-4 text-[10px]">{idx + 1}</span>
                    <span className="flex-1 whitespace-pre">
                      {line}
                      {/* Fake Collaborative cursors */}
                      {idx === 4 && (
                        <span className="relative inline-block ml-1">
                          <span className="absolute -top-4 left-0 rounded bg-indigo-500 text-[8px] text-white px-1 py-0.5 whitespace-nowrap font-sans font-bold z-10 shadow">
                            diganta
                          </span>
                          <span className="fake-cursor-pulse border-l-2 border-indigo-500 h-3 inline-block" />
                        </span>
                      )}
                      {idx === 6 && (
                        <span className="relative inline-block ml-1">
                          <span className="absolute -top-4 left-0 rounded bg-purple-500 text-[8px] text-white px-1 py-0.5 whitespace-nowrap font-sans font-bold z-10 shadow">
                            guest
                          </span>
                          <span className="fake-cursor-pulse border-l-2 border-purple-500 h-3 inline-block" />
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Ambient card background glow */}
            <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur-xl pointer-events-none" />
          </div>

        </div>
      </main>

      {/* Feature Grid Section */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-8 border-t border-[rgba(255,255,255,0.03)] py-4 flex-shrink-0">
        <div ref={cardsRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Collab feature */}
          <div
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="glass-card p-4 flex flex-col gap-2 cursor-pointer transition-transform style-preserve-3d"
          >
            <div
              onMouseEnter={handleIconHover}
              className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xs font-bold text-[var(--text-primary)]">Selection & Cursor Sync</h3>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              See what lines your team is working on, with color-coded cursors and highlighted selections matching each guest.
            </p>
          </div>

          {/* Persistence feature */}
          <div
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="glass-card p-4 flex flex-col gap-2 cursor-pointer transition-transform style-preserve-3d"
          >
            <div
              onMouseEnter={handleIconHover}
              className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <h3 className="text-xs font-bold text-[var(--text-primary)]">Permanent Persistence</h3>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              No expiration limits. Your workspaces are stored securely in MongoDB and remain available whenever you access the room URL.
            </p>
          </div>

          {/* Tech stack feature */}
          <div
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="glass-card p-4 flex flex-col gap-2 sm:col-span-2 lg:col-span-1 cursor-pointer transition-transform style-preserve-3d"
          >
            <div
              onMouseEnter={handleIconHover}
              className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-xs font-bold text-[var(--text-primary)]">Sleek Monaco Editor</h3>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Powered by VS Code's editor engine, featuring syntax highlighting for 30+ languages, auto-indent, and bracket colorization.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(255,255,255,0.03)] py-4 flex-shrink-0">
        <div className="mx-auto max-w-7xl px-6 text-center text-[10px] text-[var(--text-dim)] lg:px-8">
          <p>© {new Date().getFullYear()} CodeShare. Designed with Monaco Editor, Socket.IO, and MongoDB.</p>
        </div>
      </footer>
    </div>
  );
}
