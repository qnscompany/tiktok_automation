'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [result, setResult] = useState<string>('');

  const handleAction = async (endpoint: string, method: string = 'POST', body?: any) => {
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
    }
  };

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 2rem' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
          TikTok Automation MVP
        </h1>
        <p style={{ color: '#64748b' }}>콘텐츠 생성부터 업로드까지, AI와 함께하는 자동화 대시보드</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <button onClick={() => handleAction('/api/generate/script', 'POST', { topic: '틱톡 자동화의 미래' })}>
          스크립트 생성 테스트
        </button>
        <button onClick={() => handleAction('/api/jobs/create', 'POST', { type: 'video_gen', topic: 'AI Trends' })}>
          작업 1개 생성
        </button>
        <button onClick={() => handleAction('/api/jobs/run', 'POST')}>
          크론 수동 실행
        </button>
      </div>

      <div className="result-container">
        <div className="result-header">
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></span>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></span>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></span>
          <span style={{ marginLeft: '0.5rem' }}>Execution Result</span>
        </div>
        <pre className="result-pre">
          {result || '버튼을 눌러 테스트를 시작하세요.'}
        </pre>
      </div>
    </main>
  );
}
