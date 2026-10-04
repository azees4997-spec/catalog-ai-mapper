const https = require('https');

const SUPABASE_URL = 'https://rhxrtsjocqizhxqhbzgu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeHJ0c2pvY3Fpemh4cWhiemd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY1MzQsImV4cCI6MjA4NjkwMjUzNH0.fa6pG3IxS05ngcpbrWCWPA5NAYF1YQ2kRn9WO__81qM';
const MASTER_TABLE = 'June_Data';

function querySupabase(pathQuery) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(`${SUPABASE_URL}/rest/v1/${pathQuery}`);
    const options = {
      hostname: fullUrl.hostname,
      path: fullUrl.pathname + fullUrl.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };

    const start = Date.now();
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, duration, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, duration, data });
        }
      });
    }).on('error', err => resolve({ status: 500, duration: Date.now() - start, data: err.message }));
  });
}

async function testOperators() {
  const brand = 'CETRILAK';
  
  console.log('Testing operators for:', brand);

  const tests = [
    { name: '1. ilike.*CETRILAK*', url: `${MASTER_TABLE}?select=*&Product%20Name=ilike.*${brand}*&limit=10` },
    { name: '2. ilike.*Cetrilak*', url: `${MASTER_TABLE}?select=*&Product%20Name=ilike.*Cetrilak*&limit=10` },
    { name: '3. ilike.Cetrilak*', url: `${MASTER_TABLE}?select=*&Product%20Name=ilike.Cetrilak*&limit=10` },
    { name: '4. ilike.CETRILAK*', url: `${MASTER_TABLE}?select=*&Product%20Name=ilike.CETRILAK*&limit=10` },
    { name: '5. fts.Cetrilak', url: `${MASTER_TABLE}?select=*&Product%20Name=fts.Cetrilak&limit=10` },
    { name: '6. phfts.Cetrilak', url: `${MASTER_TABLE}?select=*&Product%20Name=phfts.Cetrilak&limit=10` },
    { name: '7. wfts.Cetrilak', url: `${MASTER_TABLE}?select=*&Product%20Name=wfts.Cetrilak&limit=10` },
  ];

  for (const t of tests) {
    const res = await querySupabase(t.url);
    const count = Array.isArray(res.data) ? res.data.length : (res.data.message || 'error');
    console.log(`${t.name.padEnd(25)} | Status: ${res.status} | Time: ${res.duration}ms | Count: ${count}`);
    if (Array.isArray(res.data) && res.data.length > 0) {
      res.data.slice(0, 2).forEach(r => console.log('   ->', r['Product ID'], '|', r['Product Name']));
    }
  }
}

testOperators();
