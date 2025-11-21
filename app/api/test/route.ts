export async function GET(request: Request) {
  const incomingTraceparent = request.headers.get('traceparent');
  
  console.log('========================================');
  console.log('🧪 NETLIFY CONTEXT EXTRACTION TEST');
  console.log('Incoming traceparent:', incomingTraceparent);
  
  // Check if we can access OpenTelemetry API
  let result;
  
  try {
    const { trace, context: otelContext, propagation } = await import('@opentelemetry/api');
    
    // Try to extract context from headers
    const carrier: Record<string, string> = {};
    request.headers.forEach((value, key) => { carrier[key.toLowerCase()] = value; });
    const extractedContext = propagation.extract(otelContext.active(), carrier);
    
    // Check if extraction worked by looking at the active span
    let extractionResult = await otelContext.with(extractedContext, async () => {
      const tracer = trace.getTracer('netlify-context-test');
      const span = tracer.startSpan('test-span');
      
      const spanContext = span.spanContext();
      const incomingTraceId = incomingTraceparent?.split('-')[1];
      const extractedTraceId = spanContext.traceId;
      const match = extractedTraceId === incomingTraceId;
      
      console.log('Incoming traceId:', incomingTraceId);
      console.log('Extracted traceId:', extractedTraceId);
      console.log('Match?', match ? '✅ YES' : '❌ NO');
      
      span.end();
      
      return {
        incomingTraceId,
        extractedTraceId,
        match,
      };
    });
    
    result = {
      test: 'Netlify OpenTelemetry Context Extraction',
      platform: 'Netlify Functions (AWS Lambda)',
      incomingTraceparent,
      ...extractionResult,
      verdict: extractionResult.match
        ? '✅ SUCCESS - Context extraction works on Netlify'
        : '❌ FAILED - TraceId mismatch',
      pid: process.pid,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.log('❌ Error during test:', error.message);
    result = {
      test: 'Netlify OpenTelemetry Context Extraction',
      error: error.message,
      verdict: '❌ FAILED - OpenTelemetry API not available',
    };
  }
  
  console.log('Test verdict:', result.verdict);
  console.log('========================================');
  
  return Response.json(result, { status: 200 });
}