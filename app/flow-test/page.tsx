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

      // Delay between steps
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Basket GET
      console.log('🛒 Calling basket get...');
      response = await fetch('/api/flow/basket-get', {
        headers: { traceparent },
      });
      data = await response.json();
      testResults.push(data);
      traceparent = data.nextTraceparent;

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Basket ADD
      console.log('➕ Calling basket add...');
      response = await fetch('/api/flow/basket-add', {
        headers: { traceparent },
      });
      data = await response.json();
      testResults.push(data);
      traceparent = data.nextTraceparent;

      // Delay before final request based on test mode
      if (testMode === 'delayed') {
        setSummary('⏳ Waiting 10 seconds to encourage Lambda cold start...');
        await new Promise(resolve => setTimeout(resolve, 10000));
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
          🧪 OpenTelemetry Context Flow Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Test Configuration</h2>
          <p className="text-gray-600 mb-4">This test simulates a user flow with trace context propagation:</p>
          <ol className="list-decimal list-inside text-gray-700 mb-6 space-y-1">
            <li>Product Page (initial trace from browser)</li>
            <li>Basket GET</li>
            <li>Basket ADD</li>
            <li>Basket VIEW (with optional delay)</li>
          </ol>
          
          <div className="space-y-3 mb-6">
            <label className="flex items-center space-x-3 text-gray-700">
              <input
                type="radio"
                value="rapid"
                checked={testMode === 'rapid'}
                onChange={(e) => setTestMode(e.target.value as 'rapid' | 'delayed')}
                disabled={isRunning}
                className="w-4 h-4"
              />
              <span>Rapid Mode (0.5s delays between requests)</span>
            </label>
            <label className="flex items-center space-x-3 text-gray-700">
              <input
                type="radio"
                value="delayed"
                checked={testMode === 'delayed'}
                onChange={(e) => setTestMode(e.target.value as 'rapid' | 'delayed')}
                disabled={isRunning}
                className="w-4 h-4"
              />
              <span>Delayed Mode (10s before final request to encourage cold start)</span>
            </label>
          </div>
          
          <button
            onClick={runTest}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
              isRunning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            }`}
          >
            {isRunning ? '⏳ Running Test...' : '▶️ Run Test'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Step-by-Step Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left border text-gray-700 font-semibold">Step</th>
                    <th className="px-4 py-3 text-left border text-gray-700 font-semibold">Route</th>
                    <th className="px-4 py-3 text-left border text-gray-700 font-semibold">Trace ID</th>
                    <th className="px-4 py-3 text-left border text-gray-700 font-semibold">PID</th>
                    <th className="px-4 py-3 text-left border text-gray-700 font-semibold">Extracted?</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border text-gray-800">{idx + 1}</td>
                      <td className="px-4 py-3 border text-gray-800">{result.route}</td>
                      <td className="px-4 py-3 border text-gray-800 font-mono text-xs break-all">
                        {result.activeTraceId}
                      </td>
                      <td className="px-4 py-3 border text-gray-800">{result.pid}</td>
                      <td className="px-4 py-3 border text-gray-800">
                        {result.contextExtracted ? '✅ Yes' : '❌ No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {summary && (
          <div className="bg-gray-900 rounded-lg shadow-xl p-6 text-green-400 font-mono text-sm whitespace-pre-wrap">
            {summary}
          </div>
        )}
      </div>
    </div>
  );
}