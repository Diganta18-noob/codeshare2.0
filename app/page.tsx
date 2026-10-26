'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import CollaborationPreview from '@/components/CollaborationPreview';
import UIIcon from '@/components/UIIcon';

const features = [
  { icon: 'people', number: '01', title: 'Better together.', description: 'One room. A shared train of thought. See every change and collaborator’s cursor as it happens.', detail: 'REAL-TIME COLLABORATION' },
  { icon: 'save', number: '02', title: 'Come back to your ideas.', description: 'Your next session starts where you left off. Keep your room link and pick things up whenever you’re ready.', detail: 'SAVED WORKSPACES' },
  { icon: 'code', number: '03', title: 'Feels like your editor.', description: 'Syntax highlighting, smart indentation, and the familiar editing experience you already know. Powered by Monaco.', detail: 'BUILT FOR DEVELOPERS' },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');
  const creatingRef = useRef(false);

  const handleCreatePad = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setIsCreating(true);
    setError('');
    try {
      const response = await fetch('/api/rooms', { method: 'POST', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Room creation failed');
      const data = await response.json();
      if (typeof data.roomId !== 'string' || !data.roomId.trim()) throw new Error('Missing room ID');
      router.push(`/c/${encodeURIComponent(data.roomId)}`);
    } catch {
      setError('Couldn’t create your room. Please try again.');
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  const handleCustomJoin = (event: React.FormEvent) => {
    event.preventDefault();
    const name = customName.trim();
    if (name && !isCreating) router.push(`/c/${encodeURIComponent(name)}`);
  };

  return (
    <div className="home-page">
      <a className="home-skip" href="#main-content">Skip to content</a>
      <header className="home-header home-container">
        <a className="home-brand" href="/" aria-label="CodeShare home">
          <span className="home-brand-mark"><UIIcon name="code" /></span>
          <span>codeshare<span className="home-brand-period">.</span></span>
          <span className="home-version">2.0</span>
        </a>
        <nav aria-label="Main navigation" className="home-nav">
          <a href="#features">Features</a>
          <a href="https://github.com/Diganta18-noob/codeshare2.0" target="_blank" rel="noopener noreferrer"><UIIcon name="github" /> GitHub <span className="home-external" aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <main id="main-content" className="home-container">
        <section className="home-hero" aria-labelledby="hero-title">
          <div className="home-hero-copy">
            <div className="home-eyebrow home-enter"><span /> A shared space for your next idea</div>
            <h1 id="hero-title" className="home-enter home-delay-1">Great code<br />starts <span>together.</span></h1>
            <p className="home-description home-enter home-delay-2">Open a room, share the link, and code together in real time. No account or setup required.</p>
            <div className="home-actions home-enter home-delay-3">
              <button className="home-create" onClick={handleCreatePad} disabled={isCreating} aria-busy={isCreating} aria-label={isCreating ? 'Creating room' : 'Create a room'}>
                {isCreating ? <span className="home-spinner" aria-hidden="true" /> : <UIIcon name="plus" />}
                <span role="status">{isCreating ? 'Creating room…' : 'Create a room'}</span>
                {!isCreating && <UIIcon name="arrow" />}
              </button>
              <p className="home-no-signup"><UIIcon name="check" /> No sign-up. Just start coding.</p>
              {error && <p className="home-error" role="alert">{error}</p>}
              <div className="home-join-divider"><span />or jump into a room<span /></div>
              <form onSubmit={handleCustomJoin} className="home-join-form">
                <label htmlFor="room-name">Have a room name?</label>
                <div className="home-room-input">
                  <span aria-hidden="true">codeshare /</span>
                  <input id="room-name" value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="your-room-name" autoComplete="off" spellCheck={false} maxLength={128} aria-describedby="room-help" disabled={isCreating} />
                  <button type="submit" disabled={!customName.trim() || isCreating} aria-label="Join room"><span>Join</span><UIIcon name="arrow" /></button>
                </div>
                <p id="room-help">Open an existing room or start a new one with a name.</p>
              </form>
            </div>
          </div>
          <div className="home-preview-wrap home-enter home-delay-2">
            <div className="home-preview-caption"><span className="home-caption-line" /> LESS SETUP. MORE BUILDING.</div>
            <CollaborationPreview />
            <div className="home-preview-note"><UIIcon name="link" /><span>A link is all it takes to get on the same page.</span></div>
          </div>
        </section>

        <section id="features" className="home-features" aria-labelledby="features-title">
          <div className="home-section-heading"><h2 id="features-title">Everything you need.<span> Nothing in your way.</span></h2><span className="home-section-label">BUILT TO KEEP YOU IN FLOW</span></div>
          <div className="home-feature-grid">
            {features.map((feature) => (
              <article className="home-feature" key={feature.number}>
                <div className="home-feature-top"><span className="home-feature-icon"><UIIcon name={feature.icon} /></span><span>{feature.number}</span></div>
                <h3>{feature.title}</h3><p>{feature.description}</p><div className="home-feature-detail"><span />{feature.detail}</div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="home-footer home-container"><a href="/" className="home-footer-brand"><UIIcon name="code" /> Made for the way you build.</a><span>© {new Date().getFullYear()} CodeShare</span><a href="https://github.com/Diganta18-noob/codeshare2.0" target="_blank" rel="noopener noreferrer">Built in the open <span aria-hidden="true">↗</span></a></footer>
    </div>
  );
}
