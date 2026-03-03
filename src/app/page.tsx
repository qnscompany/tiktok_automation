'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [result, setResult] = useState<string>('');
  const [topic, setTopic] = useState<string>('Success Habits of Highly Effective People');
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (endpoint: string, method: string = 'POST', body?: any) => {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithTikTok = () => {
    window.location.href = '/api/auth/tiktok';
  };

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: '1rem', background: 'linear-gradient(to right, #ff0050, #00f2ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          TikAutomate AI
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.25rem' }}>AI-Powered TikTok Content Automation Engine</p>
      </header>

      <section style={{ background: '#f8fafc', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 1. Authentication</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={loginWithTikTok}
            style={{
              background: '#000',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              border: 'none',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47V14.5c0 1.55-.4 3.12-1.3 4.34-1.29 1.83-3.6 2.82-5.83 2.5-2.2-.31-4.11-2.01-4.66-4.18-.55-2.18.23-4.68 1.95-6.07 1.34-1.09 3.13-1.58 4.82-1.35.01-1.35-.01-2.71.02-4.06-1.55-.25-3.13.06-4.54.76-2.58 1.28-4.16 4.13-4.13 7.02.03 2.91 1.7 5.76 4.33 7 2.62 1.22 5.86.96 8.24-.65 2.14-1.44 3.32-3.9 3.23-6.47-.01-2.31 0-4.62-.01-6.93-1.14-.04-2.28-.43-3.23-1.07-1.12-.76-1.95-1.93-2.3-3.21-.01-.23-.01-.45-.01-.68z" /></svg>
            Connect with TikTok
          </button>
          <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 500 }}>
            ● Sandbox Ready
          </span>
        </div>
      </section>

      <section style={{ background: '#fff', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 2. Create & Post</h2>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Content Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.currentTarget.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            onClick={() => handleAction('/api/jobs/create', 'POST', { type: 'video_gen', topic })}
            disabled={isLoading}
            style={{ background: '#3b82f6', color: '#fff', padding: '0.75rem', borderRadius: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}
          >
            Create Generation Job
          </button>
          <button
            onClick={() => handleAction('/api/jobs/run', 'GET')}
            disabled={isLoading}
            style={{ background: '#8b5cf6', color: '#fff', padding: '0.75rem', borderRadius: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}
          >
            Run Pipeline (Sync & Post)
          </button>
        </div>
      </section>

      <div style={{ background: '#0f172a', borderRadius: '1rem', padding: '1.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f43f5e' }}></div>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#e2e8f0' }}>System Console</span>
        </div>
        <pre style={{ margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
          {isLoading ? 'Processing...' : result || 'Waiting for interaction...'}
        </pre>
      </div>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
        <a href="/terms" style={{ color: '#64748b', marginRight: '1rem' }}>Terms</a>
        <a href="/privacy" style={{ color: '#64748b' }}>Privacy</a>
      </footer>
    </main>
  );
}
