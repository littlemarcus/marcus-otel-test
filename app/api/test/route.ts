export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const traceparent = request.headers.get('traceparent');
  const nfRequestId = request.headers.get('x-nf-request-id');
  
  console.log('========================================');
  console.log('📥 API ROUTE CALLED');
  console.log('Timestamp:', timestamp);
  console.log('Process PID:', process.pid);
  console.log('Traceparent header:', traceparent);
  console.log('x-nf-request-id:', nfRequestId);
  console.log('========================================');
  
  return Response.json({
    timestamp,
    pid: process.pid,
    traceparent,
    nfRequestId,
    message: 'Test endpoint'
  });
}