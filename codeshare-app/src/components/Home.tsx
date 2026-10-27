import React, { useState } from 'react';
import { Users, Terminal, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';

interface HomeProps {
  onStartNew: () => void;
  onNavigate: (path: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onStartNew, onNavigate }) => {
  const [demoCode, setDemoCode] = useState(`// Pair programming session
function binarySearch<T>(arr: T[], target: T): number {
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

console.log("Real-time collaboration ready!");`);

  return (
    <div>
      <section className="landing-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500, marginBottom: '1.5rem' }}>
          <Sparkles size={14} />
          <span>Real-time collaborative code sharing</span>
        </div>

        <h1>Share Code in Real-time with Developers</h1>
        <h2>An online code editor for interviews, troubleshooting, teaching &amp; more…</h2>

        <div className="landing-cta-box">
          <button
            className="btn btn-primary"
            style={{ fontSize: '1.05rem', padding: '0.75rem 1.8rem', borderRadius: '8px' }}
            onClick={onStartNew}
          >
            <span>Share Code Now</span>
            <ArrowRight size={18} />
          </button>
          <small style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Share code for free. No credit card required.
          </small>
        </div>

        {/* Live Interactive Code Preview Frame */}
        <div className="landing-preview-frame">
          <div className="preview-browser-bar">
            <div className="browser-dot red" />
            <div className="browser-dot yellow" />
            <div className="browser-dot green" />
            <div className="browser-url-pill">pastecodex.web.app/demo-session</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.75rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span>3 developers live</span>
            </div>
          </div>
          <div style={{ padding: '1.25rem', background: '#181a20', fontFamily: 'var(--font-mono)', fontSize: '13.5px', color: '#d1d5db' }}>
            <textarea
              style={{
                width: '100%',
                height: '180px',
                background: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                resize: 'none',
                outline: 'none',
                lineHeight: '1.6',
              }}
              value={demoCode}
              onChange={(e) => setDemoCode(e.target.value)}
              title="Interactive code demo"
            />
          </div>
        </div>
      </section>

      {/* Social proof logos */}
      <section style={{ borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '2rem 1rem', textAlign: 'center', background: 'var(--bg-secondary)' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Used by software engineers at companies and universities worldwide
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap', opacity: 0.6, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          <span>STANFORD</span>
          <span>MIT</span>
          <span>GOOGLE</span>
          <span>BERKELEY</span>
          <span>MICROSOFT</span>
          <span>HARVARD</span>
        </div>
      </section>

      {/* Features section */}
      <section className="landing-features">
        <div className="feature-card">
          <div className="feature-icon-bubble">
            <Users size={24} />
          </div>
          <h3>Code with your team</h3>
          <p>
            Open a PasteCodex editor, write or copy code, then share it with friends and colleagues. Pair program and troubleshoot bugs together in real-time.
          </p>
          <button className="btn btn-sm btn-secondary" onClick={onStartNew}>
            <span>Hack together</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="feature-card">
          <div className="feature-icon-bubble">
            <Terminal size={24} />
          </div>
          <h3>Interview developers</h3>
          <p>
            Set coding tasks and observe candidate thought processes in real-time when interviewing remotely or in person. Nobody likes writing code on a whiteboard.
          </p>
          <button className="btn btn-sm btn-secondary" onClick={onStartNew}>
            <span>Start an interview</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="feature-card">
          <div className="feature-icon-bubble">
            <GraduationCap size={24} />
          </div>
          <h3>Teach people to program</h3>
          <p>
            Share your code with students and peers then educate them interactively. Universities and code academies around the world use PasteCodex every single day.
          </p>
          <button className="btn btn-sm btn-secondary" onClick={onStartNew}>
            <span>Teach code</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p>
            PasteCodex — Fast, real-time code sharing with client-side zero-knowledge encryption.
          </p>
          <p>
            <a href="#" onClick={(e) => { e.preventDefault(); onStartNew(); }}>New Room</a> •{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/login'); }}>Log In</a> •{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/register'); }}>Sign Up</a>
          </p>
        </div>
      </footer>
    </div>
  );
};
