export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('========================================');
    console.log('🔧 Checking @netlify/otel availability');
    
    try {
      // Check if Netlify's OTEL is available
      const netlifyOtel = await import('@netlify/otel');
      console.log('@netlify/otel exports:', Object.keys(netlifyOtel));
      console.log('✅ @netlify/otel is available');
    } catch (e) {
      console.log('❌ @netlify/otel not available:', e.message);
    }
    
    console.log('========================================');
  }
}