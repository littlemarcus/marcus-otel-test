export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const timestamp = new Date().toISOString();
    const lambdaId = process.env.AWS_LAMBDA_LOG_STREAM_NAME || 'NOT_LAMBDA';
    const netlifyContext = process.env.NETLIFY ? 'NETLIFY' : 'NOT_NETLIFY';
    
    console.log('========================================');
    console.log('🔧 INSTRUMENTATION REGISTER CALLED');
    console.log('Timestamp:', timestamp);
    console.log('Process PID:', process.pid);
    console.log('Lambda Stream:', lambdaId);
    console.log('Netlify Context:', netlifyContext);
    console.log('Node Env:', process.env.NODE_ENV);
    console.log('Available @netlify/otel?', await checkNetlifyOtel());
    console.log('========================================');
  }
}

async function checkNetlifyOtel() {
  try {
    await import('@netlify/otel');
    return 'YES';
  } catch {
    return 'NO';
  }
}