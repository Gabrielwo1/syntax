const https = require('https');
https.get('https://thcjrzluhsbgtbirdoxl.supabase.co/functions/v1/make-server-cee56a32/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', err => console.log('Error: ', err.message));