// app/api/flow/basket-add/route.ts
import { trace, context as otelContext, propagation } from '@opentelemetry/api';

export async function GET(request: Request) {
  const incomingTraceparent = request.headers.get('traceparent');
  
  console.log('========================================');
  console.log('➕ BASKET ADD REQUEST');
  console.log('Incoming traceparent:', incomingTraceparent);
  
    const carrier: Record<string, string> = {};
    request.headers.forEach((value, key) => { carrier[key.toLowerCase()] = value; });
  const extractedContext = propagation.extract(otelContext.active(), carrier);
  
  const result = await otelContext.with(extractedContext, async () => {
    const tracer = trace.getTracer('basket-flow');
    const span = tracer.startSpan('basket-add-handler');
    
    const spanContext = span.spanContext();
    const incomingTraceId = incomingTraceparent?.split('-')[1];
    const match = incomingTraceId ? spanContext.traceId === incomingTraceId : false;
    
    console.log('Active traceId:', spanContext.traceId);
    console.log('Context extracted?', match ? '✅ YES' : '❌ NO - NEW TRACE');
    
    span.end();
    
    return {
      route: 'basket-add',
      incomingTraceparent,
      activeTraceId: spanContext.traceId,
      activeSpanId: spanContext.spanId,
      contextExtracted: match,
      nextTraceparent: `00-${spanContext.traceId}-${spanContext.spanId}-01`,
      pid: process.pid,
      timestamp: new Date().toISOString(),
    };
  });
  
  console.log('========================================');
  return Response.json(result);
}