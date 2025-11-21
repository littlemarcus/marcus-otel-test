// app/flow-test/page.tsx
'use client';

import { useState } from 'react';

type TestResult = {
  route: string;
  incomingTraceparent?: string;
  activeTraceId: string;
  activeSpanId: string;
  contextExtracted: boolean;
  nextTraceparent?: string;
  pid: number;
  timestamp: string;
};

export default function FlowTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testMode, setTestMode] = useState<'rapid' | 'delayed'>('rapid');
  const [summary, setSummary] = useState<string>('');

  const runTest = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary('');

    const testResults: TestResult[] = [];

    // Initial trace (simulating browser)
    const initialTraceId = 'aaaabbbbccccddddeeeeffffgggghhh1';
    const initialSpanId = '1111222233334444';
    let traceparent = `00-${initialTraceId}-${initialSpanId}-01`;

    try {
      // Step 1: Product page
      console.log('🛍️ Calling product page...');
      let response = await fetch('/api/flow/product', {
        headers: { traceparent },
      });
      let data = await response.json();
      testResults.push(data);
      traceparent = data.nextTraceparent;

      // Delay between steps if testing delayed mode
      if (testMode === 'delayed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 2: Basket GET
      console.log('🛒 Calling basket get...');
      response = await fetch('/api/flow/basket-get', {
        headers: { traceparent },
      });
      data = await response.json();
      testResults.push(data);
      traceparent = data.nextTraceparent;

      if (testMode === 'delayed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 3: Basket ADD
      console.log('➕ Calling basket add...');
      response = await fetch('/api/flow/basket-add', {
        headers: { traceparent },
      });
      data = await response.json();
      testResults.push(data);
      traceparent = data.nextTraceparent;

      // Big delay before final request to force cold start
      if (testMode === 'delayed') {
        setSummary('⏳ Waiting 45 seconds to force Lambda cold start...');
        await new Promise(resolve => setTimeout(resolve, 45000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 4: Basket VIEW
      console.log('👁️ Calling basket view...');
      response = await fetch('/api/flow/basket-view', {
        headers: { traceparent },
      });
      data = await response.json();
      testResults.push(data);

      setResults(testResults);
      generateSummary(testResults, initialTraceId);
    } catch (error) {
      console.error('Test error:', error);
      setSummary('❌ Test failed: ' + (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const generateSummary = (results: TestResult[], initialTraceId: string) => {
    const lines: string[] = [];
    
    lines.push('📊 TEST RESULTS\n');
    lines.push(`Initial Trace ID: ${initialTraceId}\n`);
    
    results.forEach((result, idx) => {
      const stepNum = idx + 1;
      const routeName = result.route;
      const traceId = result.activeTraceId;
      const pid = result.pid;
      
      lines.push(`${stepNum}. ${routeName}: ${traceId} (PID: ${pid})`);
    });
    
    lines.push('\n🔍 ANALYSIS\n');
    
    // Check if first request extracted context
    if (results[0].activeTraceId === initialTraceId) {
      lines.push('✅ Product page: Context extracted correctly');
    } else {
      lines.push('❌ Product page: NEW TRACE (should have used initial trace)');
    }
    
    // Check continuity between requests
    for (let i = 1; i < results.length; i++) {
      if (results[i].activeTraceId === results[i-1].activeTraceId) {
        lines.push(`✅ ${results[i].route}: Continued from ${results[i-1].route}`);
      } else {
        lines.push(`❌ ${results[i].route}: NEW TRACE (broke from ${results[i-1].route})`);
      }
    }
    
    lines.push('\n📦 LAMBDA CONTAINERS\n');
    
    // Check PIDs
    const pids = results.map(r => r.pid);
    const uniquePids = [...new Set(pids)];
    
    if (uniquePids.length === 1) {
      lines.push(`All requests used SAME Lambda container (PID: ${pids[0]})`);
    } else {
      lines.push(`Multiple Lambda containers used:`);
      uniquePids.forEach(pid => {
        const routes = results.filter(r => r.pid === pid).map(r => r.route);
        lines.push(`  PID ${pid}: ${routes.join(', ')}`);
      });
    }
    
    lines.push('\n🎯 CONCLUSION\n');
    
    const allSameTrace = results.every(r => r.activeTraceId === initialTraceId);
    const allExtracted = results.every(r => r.contextExtracted);
    
    if (allSameTrace && allExtracted) {
      lines.push('✅ Context propagation works perfectly!');
      lines.push('All requests continued the initial trace.');
    } else if (results[0].activeTraceId !== initialTraceId) {
      lines.push('❌ Context extraction FAILED at first request');
      lines.push('OpenTelemetry is not extracting incoming traceparent headers.');
    } else {
      const sameContainer = uniquePids.length === 1;
      if (sameContainer) {
        lines.push('⚠️  Context works within same Lambda container');
        lines.push('But may break when new containers start (test with delay mode).');
      } else {
        lines.push('❌ Context breaks between Lambda containers');
        lines.push('This matches the customer\'s reported behavior.');
      }
    }
    
    setSummary(lines.join('\n'));
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ marginBottom: '20px' }}>🧪 OpenTelemetry Context Flow Test</h1>
      
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>Test Configuration</h2>
        <p>This test simulates a user flow with trace context propagation:</p>
        <ol>
          <li>Product Page (initial trace from browser)</li>
          <li>Basket GET</li>
          <li>Basket ADD</li>
          <li>Basket VIEW (with optional delay)</li>
        </ol>
        
        <div style={{ marginTop: '20px' }}>
          <label style={{ marginRight: '20px' }}>
            <input
              type="radio"
              value="rapid"
              checked={testMode === 'rapid'}
              onChange={(e) => setTestMode(e.target.value as 'rapid' | 'delayed')}
              disabled={isRunning}
            />
            <span style={{ marginLeft: '8px' }}>Rapid Mode (0.5s delays)</span>
          </label>
          <label>
            <input
              type="radio"
              value="delayed"
              checked={testMode === 'delayed'}
              onChange={(e) => setTestMode(e.target.value as 'rapid' | 'delayed')}
              disabled={isRunning}
            />
            <span style={{ marginLeft: '8px' }}>Delayed Mode (45s before final request to force cold start)</span>
          </label>
        </div>
        
        <button
          onClick={runTest}
          disabled={isRunning}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: isRunning ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? '⏳ Running Test...' : '▶️ Run Test'}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Step-by-Step Results</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Step</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Route</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Trace ID</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>PID</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Extracted?</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{idx + 1}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{result.route}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd', fontFamily: 'monospace', fontSize: '12px' }}>
                    {result.activeTraceId}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{result.pid}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {result.contextExtracted ? '✅ Yes' : '❌ No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '8px',
          border: '2px solid #333',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}>
          {summary}
        </div>
      )}
    </div>
  );
}